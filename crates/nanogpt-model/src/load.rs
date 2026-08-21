use candle_core::{DType, Device};
use candle_nn::VarBuilder;
use nanogpt_schema::GptConfig;

use crate::layers::{Block, load_layer_norm};
use crate::{Gpt, ModelError, TiedLmHead};

impl Gpt {
    /// Loads canonical `[out, in]` nanoGPT tensors from an in-memory safetensors asset.
    ///
    /// The token embedding is the only physical language-model head weight. Assets containing
    /// `lm_head.weight` are rejected rather than silently duplicating tied storage.
    ///
    /// # Errors
    /// Returns [`ModelError`] for invalid configuration, keys, shapes, dtype, or device.
    pub fn from_safetensors(
        config: &GptConfig,
        bytes: &[u8],
        device: &Device,
    ) -> Result<Self, ModelError> {
        config.validate()?;
        if !device.is_cpu() {
            return Err(ModelError::UnsupportedDevice);
        }
        let weights = VarBuilder::from_slice_safetensors(bytes, DType::F32, device)?;
        if weights.contains_tensor("lm_head.weight") {
            return Err(ModelError::DuplicateLanguageModelHead);
        }
        let transformer = weights.pp("transformer");
        let wte = candle_nn::embedding(config.vocab_size, config.n_embd, transformer.pp("wte"))?;
        let wpe = candle_nn::embedding(config.block_size, config.n_embd, transformer.pp("wpe"))?;
        let mut blocks = Vec::with_capacity(config.n_layer);
        for layer in 0..config.n_layer {
            blocks.push(Block::load(config, &transformer.pp("h").pp(layer))?);
        }
        let ln_f = load_layer_norm(config, &transformer.pp("ln_f"))?;
        Ok(Self {
            wte,
            wpe,
            blocks,
            ln_f,
            lm_head: TiedLmHead::new(),
        })
    }
}
