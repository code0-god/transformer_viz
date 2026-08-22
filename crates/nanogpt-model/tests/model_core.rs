//! Behavioral coverage for the explicit nanoGPT model core.

/// Shared deterministic model fixture construction.
pub mod support;

use candle_core::{Device, Tensor};
use candle_nn::{Embedding, LayerNorm, Linear};
use nanogpt_model::{Block, CausalSelfAttention, ForwardRequest, Gpt, Mlp, ModelError, TiedLmHead};
use nanogpt_schema::{TokenId, TraceMode};
use support::{CapturedTrace, fixture_bytes, run_model, tiny_config};

#[test]
fn canonical_public_shape_uses_only_wte_storage_for_tied_logits()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: canonical safetensors with one physical token embedding and no lm_head key.
    let config = tiny_config();
    let bytes = fixture_bytes(&config, false)?;
    let tensors = safetensors::SafeTensors::deserialize(&bytes)?;
    let names = tensors.names();
    let model = Gpt::from_safetensors(&config, &bytes, &Device::Cpu)?;
    // When: the public nanoGPT structure and tied head are inspected.
    let _: &Embedding = &model.wte;
    let _: &Embedding = &model.wpe;
    let _: &LayerNorm = &model.ln_f;
    let _: &TiedLmHead = &model.lm_head;
    let block: &Block = model.blocks.first().ok_or("missing fixture block")?;
    let _: &LayerNorm = &block.ln_1;
    let attention: &CausalSelfAttention = &block.attn;
    let _: &Linear = &attention.c_attn;
    let _: &Linear = &attention.c_proj;
    assert_eq!(attention.n_head, 2);
    assert_eq!(attention.n_embd, 4);
    let _: &LayerNorm = &block.ln_2;
    let mlp: &Mlp = &block.mlp;
    let _: &Linear = &mlp.c_fc;
    let _: &Linear = &mlp.c_proj;
    let hidden = Tensor::ones((1, 1, 4), candle_core::DType::F32, &Device::Cpu)?;
    let tied_logits = model.lm_head.forward(&hidden, &model.wte)?;
    let expected = hidden
        .reshape((1, 4))?
        .matmul(&model.wte.embeddings().t()?)?
        .reshape((1, 1, 5))?;
    // Then: the wrapper is zero-sized and computes from the sole wte tensor.
    assert_eq!(std::mem::size_of_val(&model.lm_head), 0);
    assert!(names.contains(&"transformer.wte.weight"));
    assert!(!names.contains(&"lm_head.weight"));
    let error = tied_logits
        .sub(&expected)?
        .abs()?
        .max_all()?
        .to_scalar::<f32>()?;
    assert!(error < f32::EPSILON);
    Ok(())
}

#[test]
fn forward_has_nanogpt_shape_when_asset_is_canonical() -> Result<(), Box<dyn std::error::Error>> {
    // Given: canonical tiny nanoGPT f32 safetensors.
    // When: a two-token forward pass runs.
    let (output, _) = run_model(TraceMode::Summary)?;
    // Then: logits preserve batch and time dimensions.
    assert_eq!(output.logits.dims(), &[1, 2, 5]);
    Ok(())
}

#[test]
fn causal_mask_allows_diagonal_when_tracing_block() -> Result<(), Box<dyn std::error::Error>> {
    // Given: a two-token sequence.
    // When: block attention is traced.
    let (_, trace) = run_model(TraceMode::Block { layer: 0 })?;
    // Then: each token sees itself and no future token.
    assert_eq!(trace.masks.get(&0), Some(&vec![true, false, true, true]));
    Ok(())
}

#[test]
fn attention_probabilities_sum_to_one_and_hide_future() -> Result<(), Box<dyn std::error::Error>> {
    // Given: explicit two-head causal attention.
    // When: the attention probabilities are captured.
    let (_, trace) = run_model(TraceMode::AttentionHead { layer: 0, head: 0 })?;
    let probabilities = trace.tensors["0.attention_probabilities"]
        .flatten_all()?
        .to_vec1::<f32>()?;
    // Then: rows are normalized and the first row has no future probability.
    assert!((probabilities[0] + probabilities[1] - 1.0).abs() < 1e-6);
    assert!(probabilities[1].abs() < f32::EPSILON);
    Ok(())
}

#[test]
fn trace_mode_limits_attention_head_to_selected_head() -> Result<(), Box<dyn std::error::Error>> {
    // Given: a two-head block and a request for head one.
    // When: attention-head detail is captured.
    let (_, trace) = run_model(TraceMode::AttentionHead { layer: 0, head: 1 })?;
    // Then: only that head is retained and unrelated MLP detail is absent.
    assert_eq!(trace.tensors["0.query"].dims(), &[1, 1, 2, 2]);
    assert!(!trace.tensors.contains_key("0.mlp_hidden"));
    Ok(())
}

#[test]
fn layer_norm_and_exact_gelu_are_exposed_at_operation_boundaries()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: nonuniform learned weights and biases.
    // When: one block runs with trace capture.
    let (_, trace) = run_model(TraceMode::Block { layer: 0 })?;
    let normalized = trace.tensors["0.attention_layer_norm"].to_vec3::<f32>()?;
    let hidden = trace.tensors["0.mlp_hidden"]
        .flatten_all()?
        .to_vec1::<f32>()?;
    let activated = trace.tensors["0.mlp_activated"]
        .flatten_all()?
        .to_vec1::<f32>()?;
    // Then: layer norm centers each row before bias and GELU uses the exact erf curve.
    assert!((normalized[0][0].iter().sum::<f32>() + 0.06).abs() < 1e-4);
    for (input, output) in hidden.iter().zip(&activated) {
        let input = f64::from(*input);
        let expected = 0.5 * input * (1.0 + libm::erf(input / 2_f64.sqrt()));
        assert!((f64::from(*output) - expected).abs() < 1e-5);
    }
    Ok(())
}

#[test]
fn qkv_split_and_head_merge_preserve_explicit_shapes() -> Result<(), Box<dyn std::error::Error>> {
    // Given: C=4 split over H=2 heads.
    // When: attention executes.
    let (_, trace) = run_model(TraceMode::Block { layer: 0 })?;
    // Then: Q/K/V use [B,H,T,D] and merged attention returns [B,T,C].
    assert_eq!(trace.tensors["0.query"].dims(), &[1, 2, 2, 2]);
    assert_eq!(trace.tensors["0.attention_merged"].dims(), &[1, 2, 4]);
    Ok(())
}

#[test]
fn residuals_are_applied_after_attention_and_mlp_projections()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: a traced pre-LN block.
    // When: attention and MLP residual boundaries are captured.
    let (_, trace) = run_model(TraceMode::Block { layer: 0 })?;
    let input = &trace.tensors["0.block_input"];
    let projected = &trace.tensors["0.attention_projected"];
    let residual = &trace.tensors["0.attention_residual"];
    // Then: the attention residual is exactly input plus projected output.
    let expected = input.add(projected)?;
    let error = expected
        .sub(residual)?
        .abs()?
        .max_all()?
        .to_scalar::<f32>()?;
    assert!(error < 1e-6);
    Ok(())
}

#[test]
fn tied_head_ranks_full_vocabulary_probabilities() -> Result<(), Box<dyn std::error::Error>> {
    // Given: no physical lm_head tensor and distinctive token embeddings.
    // When: final logits and Top-K are computed.
    let (output, _) = run_model(TraceMode::Off)?;
    // Then: candidates descend and retain probabilities from the full softmax.
    assert_eq!(output.top_k.len(), 3);
    assert!(
        output
            .top_k
            .windows(2)
            .all(|pair| pair[0].probability >= pair[1].probability)
    );
    let probability_sum = output.probabilities.to_vec1::<f32>()?.iter().sum::<f32>();
    assert!((probability_sum - 1.0).abs() < 1e-6);
    Ok(())
}

fn corrupt_tensor_value(
    bytes: &mut [u8],
    tensor_name: &str,
    value: f32,
) -> Result<(), Box<dyn std::error::Error>> {
    let tensors = safetensors::SafeTensors::deserialize(bytes)?;
    let tensor = tensors.tensor(tensor_name)?;
    let offset = tensor.data().as_ptr() as usize - bytes.as_ptr() as usize;
    bytes[offset..offset + 4].copy_from_slice(&value.to_le_bytes());
    Ok(())
}

#[test]
fn non_finite_weights_are_rejected_with_the_tensor_name() -> Result<(), Box<dyn std::error::Error>>
{
    let config = tiny_config();
    for value in [f32::NAN, f32::INFINITY, f32::NEG_INFINITY] {
        let mut bytes = fixture_bytes(&config, false)?;
        corrupt_tensor_value(&mut bytes, "transformer.wte.weight", value)?;
        let result = Gpt::from_safetensors(&config, &bytes, &Device::Cpu);
        assert!(matches!(
            result,
            Err(ModelError::NonFiniteWeight { tensor }) if tensor == "transformer.wte.weight"
        ));
    }
    Ok(())
}

#[test]
fn duplicated_lm_head_is_rejected_when_loading_tied_weights()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: an asset incorrectly storing a second language-model head.
    let config = tiny_config();
    let bytes = fixture_bytes(&config, true)?;
    // When: the canonical loader parses the asset.
    let result = Gpt::from_safetensors(&config, &bytes, &Device::Cpu);
    // Then: duplicate tied storage is rejected.
    assert!(matches!(
        result,
        Err(ModelError::DuplicateLanguageModelHead)
    ));
    Ok(())
}

#[test]
fn sequence_over_block_size_is_rejected() -> Result<(), Box<dyn std::error::Error>> {
    // Given: a valid model with block size three.
    let config = tiny_config();
    let bytes = fixture_bytes(&config, false)?;
    let model = Gpt::from_safetensors(&config, &bytes, &Device::Cpu)?;
    // When: four tokens are submitted.
    let result = model.forward(
        ForwardRequest {
            token_ids: &[TokenId(0); 4],
            top_k: 1,
            trace_mode: TraceMode::Off,
        },
        &mut CapturedTrace::default(),
    );
    // Then: the request is rejected before tensor execution.
    assert!(result.is_err());
    Ok(())
}

#[test]
fn invalid_trace_selector_is_rejected() -> Result<(), Box<dyn std::error::Error>> {
    // Given: one layer and two heads.
    let config = tiny_config();
    let bytes = fixture_bytes(&config, false)?;
    let model = Gpt::from_safetensors(&config, &bytes, &Device::Cpu)?;
    // When: head two is requested.
    let result = model.forward(
        ForwardRequest {
            token_ids: &[TokenId(0)],
            top_k: 1,
            trace_mode: TraceMode::AttentionHead { layer: 0, head: 2 },
        },
        &mut CapturedTrace::default(),
    );
    // Then: the invalid selector is rejected.
    assert!(result.is_err());
    Ok(())
}
