use candle_core::Tensor;
use candle_nn::{LayerNorm, Linear, Module, VarBuilder};
use nanogpt_schema::GptConfig;

use crate::ModelError;
use crate::attention::{AttentionOutput, CausalSelfAttention};

const LAYER_NORM_EPSILON: f64 = 1e-5;

#[derive(Debug)]
pub(crate) struct MlpOutput {
    pub(super) input: Tensor,
    pub(super) hidden: Tensor,
    pub(super) activated: Tensor,
    pub(super) output: Tensor,
}

/// nanoGPT feed-forward expansion, exact GELU, and projection.
#[derive(Debug)]
pub struct Mlp {
    /// Residual-width to four-times-width expansion.
    pub c_fc: Linear,
    /// Four-times-width to residual-width projection.
    pub c_proj: Linear,
}

impl Mlp {
    fn load(config: &GptConfig, weights: &VarBuilder<'_>) -> Result<Self, ModelError> {
        Ok(Self {
            c_fc: candle_nn::linear_b(
                config.n_embd,
                4 * config.n_embd,
                config.bias,
                weights.pp("c_fc"),
            )?,
            c_proj: candle_nn::linear_b(
                4 * config.n_embd,
                config.n_embd,
                config.bias,
                weights.pp("c_proj"),
            )?,
        })
    }

    fn forward(&self, input: &Tensor) -> Result<MlpOutput, ModelError> {
        let hidden = self.c_fc.forward(input)?;
        let activated = hidden.gelu_erf()?;
        let output = self.c_proj.forward(&activated)?;
        Ok(MlpOutput {
            input: input.clone(),
            hidden,
            activated,
            output,
        })
    }
}

#[derive(Debug)]
pub(crate) struct BlockOutput {
    pub(super) input: Tensor,
    pub(super) attention_layer_norm: Tensor,
    pub(super) attention: AttentionOutput,
    pub(super) attention_residual: Tensor,
    pub(super) mlp_layer_norm: Tensor,
    pub(super) mlp: MlpOutput,
    pub(super) output: Tensor,
}

/// One canonical pre-layer-normalized nanoGPT Transformer block.
#[derive(Debug)]
pub struct Block {
    /// Pre-attention layer normalization.
    pub ln_1: LayerNorm,
    /// Explicit causal self-attention.
    pub attn: CausalSelfAttention,
    /// Pre-MLP layer normalization.
    pub ln_2: LayerNorm,
    /// Feed-forward network.
    pub mlp: Mlp,
}

impl Block {
    pub(crate) fn load(config: &GptConfig, weights: &VarBuilder<'_>) -> Result<Self, ModelError> {
        Ok(Self {
            ln_1: load_layer_norm(config, &weights.pp("ln_1"))?,
            attn: CausalSelfAttention::load(config, &weights.pp("attn"))?,
            ln_2: load_layer_norm(config, &weights.pp("ln_2"))?,
            mlp: Mlp::load(config, &weights.pp("mlp"))?,
        })
    }

    pub(crate) fn forward(&self, input: &Tensor) -> Result<BlockOutput, ModelError> {
        let attention_layer_norm = self.ln_1.forward(input)?;
        let attention = self.attn.forward(&attention_layer_norm)?;
        let attention_residual = input.add(&attention.projected)?;
        let mlp_layer_norm = self.ln_2.forward(&attention_residual)?;
        let mlp = self.mlp.forward(&mlp_layer_norm)?;
        let output = attention_residual.add(&mlp.output)?;
        Ok(BlockOutput {
            input: input.clone(),
            attention_layer_norm,
            attention,
            attention_residual,
            mlp_layer_norm,
            mlp,
            output,
        })
    }
}

pub(crate) fn load_layer_norm(
    config: &GptConfig,
    weights: &VarBuilder<'_>,
) -> Result<LayerNorm, ModelError> {
    let weight = weights.get(config.n_embd, "weight")?;
    if config.bias {
        let bias = weights.get(config.n_embd, "bias")?;
        Ok(LayerNorm::new(weight, bias, LAYER_NORM_EPSILON))
    } else {
        Ok(LayerNorm::new_no_bias(weight, LAYER_NORM_EPSILON))
    }
}
