use candle_core::{DType, Device, Tensor};
use candle_nn::{Embedding, LayerNorm, Module, VarBuilder};
use nanogpt_schema::{GptConfig, OperationId, TokenId, TraceMode};

use crate::layers::{Block, load_layer_norm};
use crate::trace::{
    AttentionSelection, TokenSelection, capture_attention_head, capture_block, capture_summary,
    capture_token,
};
use crate::{ForwardOutput, ForwardRequest, ModelError, TopKCandidate, TraceSink, TraceTensor};

/// Explicit nanoGPT-compatible inference model.
#[derive(Debug)]
pub struct Gpt {
    config: GptConfig,
    token_embedding: Embedding,
    position_embedding: Embedding,
    blocks: Vec<Block>,
    final_layer_norm: LayerNorm,
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
        config: GptConfig,
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
        let token_embedding =
            candle_nn::embedding(config.vocab_size, config.n_embd, transformer.pp("wte"))?;
        let position_embedding =
            candle_nn::embedding(config.block_size, config.n_embd, transformer.pp("wpe"))?;
        let mut blocks = Vec::with_capacity(config.n_layer);
        for layer in 0..config.n_layer {
            blocks.push(Block::load(&config, &transformer.pp("h").pp(layer))?);
        }
        let final_layer_norm = load_layer_norm(&config, &transformer.pp("ln_f"))?;
        Ok(Self {
            config,
            token_embedding,
            position_embedding,
            blocks,
            final_layer_norm,
        })
    }

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
        self.validate_request(&request)?;
        let sequence_length = request.token_ids.len();
        let embedding = self.embed(request.token_ids)?;
        if request.trace_mode == TraceMode::Summary {
            trace.tensor(TraceTensor {
                operation: OperationId::Embedding,
                layer: None,
                name: "embedding",
                tensor: &embedding,
            });
        }
        let hidden = self.forward_blocks(embedding, request.trace_mode, trace)?;
        let normalized = self.final_layer_norm.forward(&hidden)?;
        if request.trace_mode == TraceMode::Summary {
            trace.tensor(TraceTensor {
                operation: OperationId::FinalLayerNorm,
                layer: None,
                name: "final_layer_norm",
                tensor: &normalized,
            });
        }
        let logits = normalized
            .reshape((sequence_length, self.config.n_embd))?
            .matmul(&self.token_embedding.embeddings().t()?)?
            .reshape((1, sequence_length, self.config.vocab_size))?;
        capture_logits(trace, request.trace_mode, &logits)?;
        let final_logits = logits
            .narrow(1, sequence_length - 1, 1)?
            .squeeze(1)?
            .squeeze(0)?;
        let probabilities = candle_nn::ops::softmax(&final_logits, candle_core::D::Minus1)?;
        let top_k = self.rank_candidates(&final_logits, &probabilities, request.top_k)?;
        Ok(ForwardOutput {
            logits,
            probabilities,
            top_k,
        })
    }

    fn embed(&self, token_ids: &[TokenId]) -> Result<Tensor, ModelError> {
        let sequence_length = token_ids.len();
        let token_values = token_ids.iter().map(|token| token.0).collect::<Vec<_>>();
        let token_ids = Tensor::from_vec(token_values, (1, sequence_length), self.device())?;
        let position_values = (0..sequence_length)
            .map(u32::try_from)
            .collect::<Result<Vec<_>, _>>()
            .map_err(|_| ModelError::DimensionOverflow)?;
        let positions = Tensor::from_vec(position_values, sequence_length, self.device())?;
        let token_embedding = self.token_embedding.forward(&token_ids)?;
        let position_embedding = self.position_embedding.forward(&positions)?;
        Ok(token_embedding.broadcast_add(&position_embedding)?)
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
        &self,
        logits: &Tensor,
        probabilities: &Tensor,
        requested_count: usize,
    ) -> Result<Vec<TopKCandidate>, ModelError> {
        let candidate_count = requested_count.min(self.config.vocab_size);
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

    fn validate_request(&self, request: &ForwardRequest<'_>) -> Result<(), ModelError> {
        if request.token_ids.is_empty() {
            return Err(ModelError::EmptySequence);
        }
        if request.token_ids.len() > self.config.block_size {
            return Err(ModelError::SequenceTooLong {
                length: request.token_ids.len(),
                block_size: self.config.block_size,
            });
        }
        if let Some(token) = request
            .token_ids
            .iter()
            .find(|token| usize::try_from(token.0).map_or(true, |id| id >= self.config.vocab_size))
        {
            return Err(ModelError::TokenOutOfRange(token.0));
        }
        match request.trace_mode {
            TraceMode::Off | TraceMode::Summary => Ok(()),
            TraceMode::Block { layer } => self.validate_layer(layer),
            TraceMode::AttentionHead { layer, head } => {
                self.validate_layer(layer)?;
                self.validate_head(head)
            }
            TraceMode::Token { layer, head, token } => {
                self.validate_layer(layer)?;
                self.validate_head(head)?;
                if token < request.token_ids.len() {
                    Ok(())
                } else {
                    Err(ModelError::InvalidTraceSelector)
                }
            }
        }
    }

    const fn validate_layer(&self, layer: usize) -> Result<(), ModelError> {
        if layer < self.config.n_layer {
            Ok(())
        } else {
            Err(ModelError::InvalidTraceSelector)
        }
    }

    const fn validate_head(&self, head: usize) -> Result<(), ModelError> {
        if head < self.config.n_head {
            Ok(())
        } else {
            Err(ModelError::InvalidTraceSelector)
        }
    }

    fn device(&self) -> &Device {
        self.token_embedding.embeddings().device()
    }
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
