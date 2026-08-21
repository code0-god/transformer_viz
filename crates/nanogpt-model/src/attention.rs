use candle_core::Tensor;
use candle_nn::{Linear, Module, VarBuilder};
use nanogpt_schema::GptConfig;

use crate::ModelError;

const BLOCKED_SCORE: f32 = f32::NEG_INFINITY;

#[derive(Debug)]
pub(crate) struct AttentionOutput {
    pub(super) query: Tensor,
    pub(super) key: Tensor,
    pub(super) value: Tensor,
    pub(super) raw_scores: Tensor,
    pub(super) scaled_scores: Tensor,
    pub(super) mask: Vec<bool>,
    pub(super) probabilities: Tensor,
    pub(super) attended: Tensor,
    pub(super) merged: Tensor,
    pub(super) projected: Tensor,
}

#[derive(Debug)]
pub(crate) struct CausalSelfAttention {
    c_attn: Linear,
    c_proj: Linear,
    head_count: usize,
    embedding_size: usize,
}

impl CausalSelfAttention {
    pub(crate) fn load(config: &GptConfig, weights: &VarBuilder<'_>) -> Result<Self, ModelError> {
        Ok(Self {
            c_attn: candle_nn::linear_b(
                config.n_embd,
                3 * config.n_embd,
                config.bias,
                weights.pp("c_attn"),
            )?,
            c_proj: candle_nn::linear_b(
                config.n_embd,
                config.n_embd,
                config.bias,
                weights.pp("c_proj"),
            )?,
            head_count: config.n_head,
            embedding_size: config.n_embd,
        })
    }

    pub(crate) fn forward(&self, input: &Tensor) -> Result<AttentionOutput, ModelError> {
        let (batch_size, sequence_length, embedding_size) = input.dims3()?;
        let head_size = embedding_size / self.head_count;
        let qkv = self.c_attn.forward(input)?;
        let query = qkv
            .narrow(2, 0, self.embedding_size)?
            .reshape((batch_size, sequence_length, self.head_count, head_size))?
            .transpose(1, 2)?
            .contiguous()?;
        let key = qkv
            .narrow(2, self.embedding_size, self.embedding_size)?
            .reshape((batch_size, sequence_length, self.head_count, head_size))?
            .transpose(1, 2)?
            .contiguous()?;
        let value = qkv
            .narrow(2, 2 * self.embedding_size, self.embedding_size)?
            .reshape((batch_size, sequence_length, self.head_count, head_size))?
            .transpose(1, 2)?
            .contiguous()?;
        let raw_scores = query.matmul(&key.transpose(2, 3)?)?;
        let scale =
            f64::from(u32::try_from(head_size).map_err(|_| ModelError::DimensionOverflow)?).sqrt();
        let scaled_scores = (&raw_scores / scale)?;
        let allowed = (0..sequence_length)
            .flat_map(|row| (0..sequence_length).map(move |column| column <= row))
            .collect::<Vec<_>>();
        let mask_values = allowed
            .iter()
            .map(|is_allowed| u8::from(*is_allowed))
            .collect::<Vec<_>>();
        let mask = Tensor::from_vec(
            mask_values,
            (sequence_length, sequence_length),
            input.device(),
        )?
        .broadcast_left((batch_size, self.head_count))?
        .contiguous()?;
        let blocked = Tensor::full(BLOCKED_SCORE, raw_scores.shape(), input.device())?;
        let masked_scores = mask.where_cond(&scaled_scores, &blocked)?;
        let probabilities = candle_nn::ops::softmax(&masked_scores, candle_core::D::Minus1)?;
        let attended = probabilities.matmul(&value)?;
        let merged = attended.transpose(1, 2)?.contiguous()?.reshape((
            batch_size,
            sequence_length,
            embedding_size,
        ))?;
        let projected = self.c_proj.forward(&merged)?;
        Ok(AttentionOutput {
            query,
            key,
            value,
            raw_scores,
            scaled_scores,
            mask: allowed,
            probabilities,
            attended,
            merged,
            projected,
        })
    }
}
