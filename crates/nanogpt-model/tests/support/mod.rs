use std::collections::HashMap;

use candle_core::{Device, Tensor};
use nanogpt_model::{CausalMask, ForwardOutput, ForwardRequest, Gpt, TraceSink, TraceTensor};
use nanogpt_schema::{GptConfig, TokenId, TraceMode};

#[derive(Debug, Default)]
pub(super) struct CapturedTrace {
    pub(super) tensors: HashMap<String, Tensor>,
    pub(super) masks: HashMap<usize, Vec<bool>>,
}

impl TraceSink for CapturedTrace {
    fn tensor(&mut self, trace: TraceTensor<'_>) {
        let layer = trace
            .layer
            .map_or_else(String::new, |value| format!("{value}."));
        self.tensors
            .insert(format!("{layer}{}", trace.name), trace.tensor.clone());
    }

    fn causal_mask(&mut self, mask: CausalMask<'_>) {
        self.masks.insert(mask.layer, mask.allowed.to_vec());
    }
}

pub(super) const fn tiny_config() -> GptConfig {
    GptConfig {
        block_size: 3,
        vocab_size: 5,
        n_layer: 1,
        n_head: 2,
        n_embd: 4,
        bias: true,
    }
}

fn values(count: usize, scale: f32) -> Vec<f32> {
    const CYCLE: [f32; 7] = [-3.0, -2.0, -1.0, 0.0, 1.0, 2.0, 3.0];
    (0..count)
        .map(|index| CYCLE[index % CYCLE.len()] * scale)
        .collect()
}

fn tensor(shape: &[usize], scale: f32, device: &Device) -> Result<Tensor, candle_core::Error> {
    Tensor::from_vec(values(shape.iter().product(), scale), shape, device)
}

pub(super) fn fixture_bytes(
    config: &GptConfig,
    duplicate_head: bool,
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let device = Device::Cpu;
    let embedding = config.n_embd;
    let mut tensors = HashMap::from([
        (
            "transformer.wte.weight".to_owned(),
            tensor(&[config.vocab_size, embedding], 0.11, &device)?,
        ),
        (
            "transformer.wpe.weight".to_owned(),
            tensor(&[config.block_size, embedding], 0.07, &device)?,
        ),
        (
            "transformer.h.0.ln_1.weight".to_owned(),
            Tensor::ones(embedding, candle_core::DType::F32, &device)?,
        ),
        (
            "transformer.h.0.ln_1.bias".to_owned(),
            tensor(&[embedding], 0.01, &device)?,
        ),
        (
            "transformer.h.0.attn.c_attn.weight".to_owned(),
            tensor(&[3 * embedding, embedding], 0.05, &device)?,
        ),
        (
            "transformer.h.0.attn.c_attn.bias".to_owned(),
            tensor(&[3 * embedding], 0.01, &device)?,
        ),
        (
            "transformer.h.0.attn.c_proj.weight".to_owned(),
            tensor(&[embedding, embedding], 0.04, &device)?,
        ),
        (
            "transformer.h.0.attn.c_proj.bias".to_owned(),
            tensor(&[embedding], 0.01, &device)?,
        ),
        (
            "transformer.h.0.ln_2.weight".to_owned(),
            Tensor::ones(embedding, candle_core::DType::F32, &device)?,
        ),
        (
            "transformer.h.0.ln_2.bias".to_owned(),
            tensor(&[embedding], 0.01, &device)?,
        ),
        (
            "transformer.h.0.mlp.c_fc.weight".to_owned(),
            tensor(&[4 * embedding, embedding], 0.03, &device)?,
        ),
        (
            "transformer.h.0.mlp.c_fc.bias".to_owned(),
            tensor(&[4 * embedding], 0.01, &device)?,
        ),
        (
            "transformer.h.0.mlp.c_proj.weight".to_owned(),
            tensor(&[embedding, 4 * embedding], 0.02, &device)?,
        ),
        (
            "transformer.h.0.mlp.c_proj.bias".to_owned(),
            tensor(&[embedding], 0.01, &device)?,
        ),
        (
            "transformer.ln_f.weight".to_owned(),
            Tensor::ones(embedding, candle_core::DType::F32, &device)?,
        ),
        (
            "transformer.ln_f.bias".to_owned(),
            tensor(&[embedding], 0.01, &device)?,
        ),
    ]);
    if duplicate_head {
        tensors.insert(
            "lm_head.weight".to_owned(),
            tensor(&[config.vocab_size, embedding], 0.13, &device)?,
        );
    }
    Ok(safetensors::tensor::serialize(
        tensors.iter().map(|(name, value)| (name.as_str(), value)),
        None,
    )?)
}

pub(super) fn run_model(
    mode: TraceMode,
) -> Result<(ForwardOutput, CapturedTrace), Box<dyn std::error::Error>> {
    let config = tiny_config();
    let bytes = fixture_bytes(&config, false)?;
    let model = Gpt::from_safetensors(config, &bytes, &Device::Cpu)?;
    let mut trace = CapturedTrace::default();
    let output = model.forward(
        ForwardRequest {
            token_ids: &[TokenId(0), TokenId(1)],
            top_k: 3,
            trace_mode: mode,
        },
        &mut trace,
    )?;
    Ok((output, trace))
}
