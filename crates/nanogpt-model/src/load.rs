use candle_core::{DType, Device, safetensors::SliceSafetensors};
use candle_nn::VarBuilder;
use nanogpt_schema::GptConfig;

use crate::layers::{Block, load_layer_norm};
use crate::{Gpt, ModelError, TiedLmHead};

/// Counts unique physically stored tensor elements and validates every f32 value.
///
/// # Errors
/// Returns [`ModelError`] for malformed safetensors, non-f32/non-finite data, or count overflow.
pub fn stored_parameter_count(bytes: &[u8]) -> Result<u64, ModelError> {
    let tensors = SliceSafetensors::new(bytes)
        .map_err(|error| ModelError::InvalidAsset(error.to_string()))?;
    let mut count = 0_u64;
    for (name, tensor) in tensors.tensors() {
        if DType::try_from(tensor.dtype())? != DType::F32 {
            return Err(ModelError::InvalidAsset(format!(
                "tensor '{name}' must use f32"
            )));
        }
        let elements =
            tensor
                .shape()
                .iter()
                .try_fold(1_u64, |product: u64, &dimension| -> Option<u64> {
                    product.checked_mul(u64::try_from(dimension).ok()?)
                });
        let elements = elements.ok_or(ModelError::ParameterCountOverflow)?;
        count = count
            .checked_add(elements)
            .ok_or(ModelError::ParameterCountOverflow)?;
        if tensor
            .data()
            .chunks_exact(4)
            .any(|chunk| !f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]).is_finite())
        {
            return Err(ModelError::NonFiniteWeight { tensor: name });
        }
    }
    Ok(count)
}

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
        let _parameter_count = stored_parameter_count(bytes)?;
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
