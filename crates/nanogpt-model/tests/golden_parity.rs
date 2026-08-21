//! Python nanoGPT to Rust forward-pass golden integration.

use std::collections::HashMap;

use candle_core::{Device, Tensor};
use nanogpt_model::{CausalMask, ForwardRequest, Gpt, TraceSink, TraceTensor};
use nanogpt_schema::{GptConfig, TraceMode};
use nanogpt_tokenizer::Tokenizer;
use safetensors::{Dtype, SafeTensors, tensor::TensorView};

const CONFIG: &str = include_str!("../../../assets/models/edu/config.json");
const METADATA: &str = include_str!("../../../assets/golden/edu/metadata.json");
const TOKENIZER: &str = include_str!("../../../assets/models/edu/tokenizer.json");
const GOLDEN: &[u8] = include_bytes!("../../../assets/golden/edu/trace.safetensors");
const WEIGHTS: &[u8] = include_bytes!("../../../assets/models/edu/model.safetensors");
const TOLERANCE: f32 = 1.0e-4;

#[derive(Debug, Default)]
struct CapturedTrace {
    tensors: HashMap<String, Tensor>,
    masks: HashMap<usize, Vec<bool>>,
}

impl TraceSink for CapturedTrace {
    fn tensor(&mut self, trace: TraceTensor<'_>) {
        let name = trace.layer.map_or_else(
            || canonical_name(trace.name).to_owned(),
            |layer| format!("layer.{layer}.{}", canonical_name(trace.name)),
        );
        self.tensors.insert(name, trace.tensor.clone());
    }

    fn causal_mask(&mut self, mask: CausalMask<'_>) {
        self.masks.insert(mask.layer, mask.allowed.to_vec());
    }
}

fn canonical_name(name: &str) -> &str {
    match name {
        "embedding" => "embedding_sum",
        "block_input" => "input",
        "attention_layer_norm" => "ln_1",
        "attention_raw_scores" => "raw_scores",
        "attention_scaled_scores" => "scaled_scores",
        "attention_probabilities" => "probabilities",
        "attention_merged" => "merged",
        "attention_projected" => "projected",
        "mlp_layer_norm" => "ln_2",
        "block_output" => "output",
        other => other,
    }
}

#[test]
fn rust_forward_matches_python_nanogpt_when_fixture_is_canonical()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: the committed Python nanoGPT trace and its canonical prompt token IDs.
    let golden = SafeTensors::deserialize(GOLDEN)?;
    let expected_token_ids = i64_values(&golden.tensor("tokens")?)?
        .into_iter()
        .map(u32::try_from)
        .collect::<Result<Vec<_>, _>>()?;
    let metadata = serde_json::from_str::<serde_json::Value>(METADATA)?;
    let prompt = metadata
        .get("prompt")
        .and_then(serde_json::Value::as_str)
        .ok_or("golden metadata is missing prompt")?;
    let tokenizer = Tokenizer::from_json(TOKENIZER)?;
    let token_ids = tokenizer.encode(prompt).ids();
    assert_eq!(
        token_ids.iter().map(|token| token.0).collect::<Vec<_>>(),
        expected_token_ids,
        "Rust token IDs differ from Python"
    );
    let config: GptConfig = serde_json::from_str(CONFIG)?;
    let model = Gpt::from_safetensors(&config, WEIGHTS, &Device::Cpu)?;
    let mut rust = CapturedTrace::default();

    // When: Rust evaluates the same tokens through summary and every block detail mode.
    let output = model.forward(
        ForwardRequest {
            token_ids: &token_ids,
            top_k: 3,
            trace_mode: TraceMode::Summary,
        },
        &mut rust,
    )?;
    for layer in 0..config.n_layer {
        model.forward(
            ForwardRequest {
                token_ids: &token_ids,
                top_k: 3,
                trace_mode: TraceMode::Block { layer },
            },
            &mut rust,
        )?;
    }
    rust.tensors.insert(
        "last_token_logits".to_owned(),
        output
            .logits
            .narrow(1, token_ids.len() - 1, 1)?
            .squeeze(1)?,
    );

    // Then: every required operation boundary satisfies abs/rel 1e-4.
    for name in required_names(config.n_layer) {
        let actual = rust
            .tensors
            .get(&name)
            .ok_or_else(|| format!("Rust trace tensor is missing: {name}"))?;
        compare(&name, actual, &golden.tensor(&name)?)?;
    }
    for layer in 0..config.n_layer {
        let name = format!("layer.{layer}.mask");
        let expected = bool_values(&golden.tensor(&name)?)?;
        let actual = rust
            .masks
            .get(&layer)
            .ok_or_else(|| format!("Rust trace mask is missing: {name}"))?;
        assert_eq!(actual, &expected, "causal mask differs for {name}");

        let probabilities = rust
            .tensors
            .get(&format!("layer.{layer}.probabilities"))
            .ok_or_else(|| format!("probabilities are missing for layer {layer}"))?
            .flatten_all()?
            .to_vec1::<f32>()?;
        let sequence = token_ids.len();
        for (row_index, row) in probabilities.chunks_exact(sequence).enumerate() {
            let token = row_index % sequence;
            let sum = row.iter().sum::<f32>();
            assert!(
                (sum - 1.0).abs() <= TOLERANCE,
                "layer {layer} row {token} sums to {sum}"
            );
            assert!(row[(token + 1)..].iter().all(|value| *value == 0.0));
        }
    }
    let expected_top_k = i64_values(&golden.tensor("top_k_ids")?)?;
    let actual_top_k = output
        .top_k
        .iter()
        .map(|candidate| i64::from(candidate.token_id.0))
        .collect::<Vec<_>>();
    assert_eq!(actual_top_k, expected_top_k, "final Top-3 IDs differ");
    println!("PARITY top_k_ids exact=true");
    Ok(())
}

fn required_names(layer_count: usize) -> Vec<String> {
    let mut names = [
        "token_embeddings",
        "position_embeddings",
        "embedding_sum",
        "final_layer_norm",
        "logits",
        "last_token_logits",
    ]
    .map(str::to_owned)
    .to_vec();
    for layer in 0..layer_count {
        for suffix in [
            "input",
            "ln_1",
            "query",
            "key",
            "value",
            "raw_scores",
            "scaled_scores",
            "probabilities",
            "attention_output",
            "merged",
            "projected",
            "attention_residual",
            "ln_2",
            "mlp_hidden",
            "mlp_activated",
            "mlp_output",
            "output",
        ] {
            names.push(format!("layer.{layer}.{suffix}"));
        }
    }
    names
}

fn compare(
    name: &str,
    actual: &Tensor,
    expected: &TensorView<'_>,
) -> Result<(), Box<dyn std::error::Error>> {
    assert_eq!(actual.dims(), expected.shape(), "shape differs for {name}");
    let actual = actual.flatten_all()?.to_vec1::<f32>()?;
    let expected = f32_values(expected)?;
    let mut max_abs = 0.0_f32;
    let mut max_rel = 0.0_f32;
    for (rust, python) in actual.iter().zip(expected) {
        let absolute = (rust - python).abs();
        let relative = absolute / python.abs().max(f32::MIN_POSITIVE);
        max_abs = max_abs.max(absolute);
        max_rel = max_rel.max(relative);
        assert!(
            absolute <= TOLERANCE.mul_add(python.abs(), TOLERANCE),
            "{name}: Rust {rust} differs from Python {python} by {absolute}"
        );
    }
    println!("PARITY {name} max_abs={max_abs:.8e} max_rel={max_rel:.8e}");
    Ok(())
}

fn f32_values(view: &TensorView<'_>) -> Result<Vec<f32>, String> {
    if view.dtype() != Dtype::F32 {
        return Err(format!("expected F32, found {:?}", view.dtype()));
    }
    Ok(view
        .data()
        .chunks_exact(size_of::<f32>())
        .map(|bytes| f32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
        .collect())
}

fn i64_values(view: &TensorView<'_>) -> Result<Vec<i64>, String> {
    if view.dtype() != Dtype::I64 {
        return Err(format!("expected I64, found {:?}", view.dtype()));
    }
    Ok(view
        .data()
        .chunks_exact(size_of::<i64>())
        .map(|bytes| {
            i64::from_le_bytes([
                bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
            ])
        })
        .collect())
}

fn bool_values(view: &TensorView<'_>) -> Result<Vec<bool>, String> {
    if view.dtype() != Dtype::BOOL {
        return Err(format!("expected BOOL, found {:?}", view.dtype()));
    }
    Ok(view.data().iter().map(|value| *value != 0).collect())
}
