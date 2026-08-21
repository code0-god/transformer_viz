use candle_core::{Device, Tensor};
use candle_nn::{Embedding, LayerNorm, Module};
use nanogpt_schema::{OperationId, TokenId, TraceMode};

use crate::layers::Block;
use crate::trace::{
    AttentionSelection, TokenSelection, capture_attention_head, capture_block, capture_summary,
    capture_token,
};
use crate::{
    ForwardOutput, ForwardRequest, ModelError, TiedLmHead, TopKCandidate, TraceSink, TraceTensor,
};

/// Explicit nanoGPT-compatible inference model.
#[derive(Debug)]
pub struct Gpt {
    /// Learned token embedding, shared with [`TiedLmHead`].
    pub wte: Embedding,
    /// Learned position embedding.
    pub wpe: Embedding,
    /// Ordered Transformer blocks.
    pub blocks: Vec<Block>,
    /// Final layer normalization.
    pub ln_f: LayerNorm,
    /// Zero-storage language-model head.
    pub lm_head: TiedLmHead,
}

impl Gpt {
    /// Evaluates one f32 CPU batch and emits selected explicit operation boundaries.
    ///
    /// # Errors
    /// Returns [`ModelError`] for invalid tokens, sequence length, trace selectors, or tensor
    /// evaluation failures.
    pub fn forward(
        &self,
        request: ForwardRequest<'_>,
        trace: &mut impl TraceSink,
    ) -> Result<ForwardOutput, ModelError> {
        crate::request::validate(self, &request)?;
        let sequence_length = request.token_ids.len();
        let embeddings = self.embed(request.token_ids)?;
        if request.trace_mode == TraceMode::Summary {
            for (name, tensor) in [
                ("token_embeddings", &embeddings.token),
                ("position_embeddings", &embeddings.position),
                ("embedding_sum", &embeddings.sum),
                ("embedding", &embeddings.sum),
            ] {
                trace.tensor(TraceTensor {
                    operation: OperationId::Embedding,
                    layer: None,
                    name,
                    tensor,
                });
            }
        }
        let hidden = self.forward_blocks(embeddings.sum, request.trace_mode, trace)?;
        let normalized = self.ln_f.forward(&hidden)?;
        if request.trace_mode == TraceMode::Summary {
            trace.tensor(TraceTensor {
                operation: OperationId::FinalLayerNorm,
                layer: None,
                name: "final_layer_norm",
                tensor: &normalized,
            });
        }
        let logits = self.lm_head.forward(&normalized, &self.wte)?;
        capture_logits(trace, request.trace_mode, &logits)?;
        let final_logits = logits
            .narrow(1, sequence_length - 1, 1)?
            .squeeze(1)?
            .squeeze(0)?
            .force_contiguous()?;
        let probabilities = candle_nn::ops::softmax(&final_logits, candle_core::D::Minus1)?;
        let top_k = Self::rank_candidates(&final_logits, &probabilities, request.top_k)?;
        Ok(ForwardOutput {
            logits,
            probabilities,
            top_k,
        })
    }

    fn embed(&self, token_ids: &[TokenId]) -> Result<Embeddings, ModelError> {
        let sequence_length = token_ids.len();
        let token_values = token_ids.iter().map(|token| token.0).collect::<Vec<_>>();
        let token_ids = Tensor::from_vec(token_values, (1, sequence_length), self.device())?;
        let position_values = (0..sequence_length)
            .map(u32::try_from)
            .collect::<Result<Vec<_>, _>>()
            .map_err(|_| ModelError::DimensionOverflow)?;
        let positions = Tensor::from_vec(position_values, sequence_length, self.device())?;
        let token = self.wte.forward(&token_ids)?;
        let position = self.wpe.forward(&positions)?;
        let sum = token.broadcast_add(&position)?;
        Ok(Embeddings {
            token,
            position,
            sum,
        })
    }

    fn forward_blocks(
        &self,
        initial_hidden: Tensor,
        mode: TraceMode,
        trace: &mut impl TraceSink,
    ) -> Result<Tensor, ModelError> {
        let mut hidden = initial_hidden;
        for (layer, block) in self.blocks.iter().enumerate() {
            let output = block.forward(&hidden)?;
            match mode {
                TraceMode::Summary => capture_summary(trace, layer, &output),
                TraceMode::Block { layer: selected } if selected == layer => {
                    capture_block(trace, layer, &output)?;
                }
                TraceMode::AttentionHead {
                    layer: selected,
                    head,
                } if selected == layer => {
                    capture_attention_head(trace, AttentionSelection { layer, head }, &output)?;
                }
                TraceMode::Token {
                    layer: selected,
                    head,
                    token,
                } if selected == layer => {
                    capture_token(trace, TokenSelection { layer, head, token }, &output)?;
                }
                TraceMode::Off
                | TraceMode::Block { .. }
                | TraceMode::AttentionHead { .. }
                | TraceMode::Token { .. } => {}
            }
            hidden = output.output;
        }
        Ok(hidden)
    }

    fn rank_candidates(
        logits: &Tensor,
        probabilities: &Tensor,
        requested_count: usize,
    ) -> Result<Vec<TopKCandidate>, ModelError> {
        let candidate_count = requested_count.min(probabilities.elem_count());
        if candidate_count == 0 {
            return Ok(Vec::new());
        }
        let (sorted_logits, sorted_ids) = logits.sort_last_dim(false)?;
        let top_logits = sorted_logits
            .narrow(0, 0, candidate_count)?
            .to_vec1::<f32>()?;
        let top_ids = sorted_ids.narrow(0, 0, candidate_count)?;
        let top_probabilities = probabilities.index_select(&top_ids, 0)?.to_vec1::<f32>()?;
        Ok(top_ids
            .to_vec1::<u32>()?
            .into_iter()
            .zip(top_logits)
            .zip(top_probabilities)
            .map(|((token_id, logit), probability)| TopKCandidate {
                token_id: TokenId(token_id),
                logit,
                probability,
            })
            .collect())
    }

    fn device(&self) -> &Device {
        self.wte.embeddings().device()
    }
}

struct Embeddings {
    token: Tensor,
    position: Tensor,
    sum: Tensor,
}

fn capture_logits(
    trace: &mut impl TraceSink,
    mode: TraceMode,
    logits: &Tensor,
) -> Result<(), ModelError> {
    match mode {
        TraceMode::Summary => trace.tensor(TraceTensor {
            operation: OperationId::Logits,
            layer: None,
            name: "logits",
            tensor: logits,
        }),
        TraceMode::Token { token, .. } => {
            let selected_logits = logits.narrow(1, token, 1)?;
            trace.tensor(TraceTensor {
                operation: OperationId::Logits,
                layer: None,
                name: "logits",
                tensor: &selected_logits,
            });
        }
        TraceMode::Off | TraceMode::Block { .. } | TraceMode::AttentionHead { .. } => {}
    }
    Ok(())
}
