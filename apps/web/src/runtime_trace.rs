//! Conversion from Candle trace events to bounded Worker response DTOs.

use candle_core::Tensor;
use nanogpt_model::{CausalMask, ForwardOutput, TraceSink, TraceTensor};
use nanogpt_schema::{
    AttentionHeadTrace, BlockTrace, EmbeddingTrace, FiniteF32, LayerSummary, MaskSnapshot,
    MlpTrace, OperationTrace, RunSummary, SchemaVersion, TensorSnapshot, TokenInfo, TokenTrace,
};

use crate::runtime_error::RuntimeError;
pub(crate) use crate::runtime_trace_support::TokenSelection;
use crate::runtime_trace_support::{logits_trace, snapshot, source};

#[derive(Debug)]
struct CapturedTensor {
    operation: nanogpt_schema::OperationId,
    layer: Option<usize>,
    snapshot: TensorSnapshot,
}

/// Bounded collector used for one summary or selected detail replay.
#[derive(Debug, Default)]
pub struct TraceCapture {
    tensors: Vec<CapturedTensor>,
    layer_inputs: Vec<(usize, Tensor)>,
    mask: Option<MaskSnapshot>,
    error: Option<RuntimeError>,
}

impl TraceSink for TraceCapture {
    fn tensor(&mut self, trace: TraceTensor<'_>) {
        if self.error.is_some() {
            return;
        }
        if trace.name == "block_input"
            && let Some(layer) = trace.layer
        {
            self.layer_inputs.push((layer, trace.tensor.clone()));
        }
        match snapshot(trace.name, trace.tensor) {
            Ok(snapshot) => self.tensors.push(CapturedTensor {
                operation: trace.operation,
                layer: trace.layer,
                snapshot,
            }),
            Err(error) => self.error = Some(error),
        }
    }

    fn causal_mask(&mut self, mask: CausalMask<'_>) {
        if self.error.is_none() {
            match MaskSnapshot::new(mask.rows, mask.columns, mask.allowed.to_vec()) {
                Ok(snapshot) => self.mask = Some(snapshot),
                Err(error) => self.error = Some(error.into()),
            }
        }
    }
}

impl TraceCapture {
    pub(crate) fn summary(
        mut self,
        run_id: u64,
        tokens: Vec<TokenInfo>,
        output: &ForwardOutput,
        duration_ms: FiniteF32,
    ) -> Result<RunSummary, RuntimeError> {
        self.finish()?;
        let embeddings = EmbeddingTrace {
            token: self.named("token_embeddings")?.clone(),
            position: self.named("position_embeddings")?.clone(),
            sum: self.named("embedding_sum")?.clone(),
            source: source(nanogpt_schema::OperationId::Embedding)?,
        };
        let final_layer_norm = self.named("final_layer_norm")?.clone();
        let mut layers = Vec::new();
        for layer in 0..self.layer_count() {
            layers.push(LayerSummary {
                layer,
                input: self.layer_named(layer, "block_input")?.stats.clone(),
                attention: self
                    .layer_named(layer, "attention_projected")?
                    .stats
                    .clone(),
                mlp: self.layer_named(layer, "mlp_output")?.stats.clone(),
                output: self.layer_named(layer, "block_output")?.stats.clone(),
            });
        }
        Ok(RunSummary {
            schema_version: SchemaVersion::current(),
            run_id,
            tokens,
            layers,
            duration_ms,
            embeddings,
            final_layer_norm,
            logits: logits_trace(output)?,
        })
    }

    pub(crate) fn block(mut self, run_id: u64, layer: usize) -> Result<BlockTrace, RuntimeError> {
        self.finish()?;
        let operations = self
            .tensors
            .iter()
            .filter(|item| item.layer == Some(layer))
            .map(|item| {
                Ok(OperationTrace {
                    operation: item.operation,
                    source: source(item.operation)?,
                    tensor: item.snapshot.clone(),
                    output: item.snapshot.stats.clone(),
                })
            })
            .collect::<Result<Vec<_>, RuntimeError>>()?;
        Ok(BlockTrace {
            schema_version: SchemaVersion::current(),
            run_id,
            layer,
            operations,
            attention_residual: self.layer_named(layer, "attention_residual")?.clone(),
            mlp: MlpTrace {
                layer,
                input: self.layer_named(layer, "mlp_input")?.clone(),
                hidden: self.layer_named(layer, "mlp_hidden")?.clone(),
                activated: self.layer_named(layer, "mlp_activated")?.clone(),
                output: self.layer_named(layer, "mlp_output")?.clone(),
                source: source(nanogpt_schema::OperationId::Mlp)?,
            },
            output: self.layer_named(layer, "block_output")?.clone(),
        })
    }

    pub(crate) fn head(
        mut self,
        layer: usize,
        head: usize,
    ) -> Result<AttentionHeadTrace, RuntimeError> {
        self.finish()?;
        Ok(AttentionHeadTrace {
            layer,
            head,
            query: self.layer_named(layer, "query")?.clone(),
            key: self.layer_named(layer, "key")?.clone(),
            value: self.layer_named(layer, "value")?.clone(),
            raw_scores: self.layer_named(layer, "attention_raw_scores")?.clone(),
            scaled_scores: self.layer_named(layer, "attention_scaled_scores")?.clone(),
            mask: self.mask.clone().ok_or(RuntimeError::InvalidSelector)?,
            probabilities: self.layer_named(layer, "attention_probabilities")?.clone(),
            output: self.layer_named(layer, "attention_output")?.clone(),
            source: source(nanogpt_schema::OperationId::Attention)?,
        })
    }

    pub(crate) fn token(
        mut self,
        selection: TokenSelection<'_>,
        output: &ForwardOutput,
    ) -> Result<TokenTrace, RuntimeError> {
        self.finish()?;
        let token_info = selection
            .tokens
            .get(selection.token)
            .cloned()
            .ok_or(RuntimeError::InvalidSelector)?;
        Ok(TokenTrace {
            schema_version: SchemaVersion::current(),
            run_id: selection.run_id,
            layer: selection.layer,
            head: selection.head,
            token: selection.token,
            token_info,
            input: self.layer_named(selection.layer, "block_input")?.clone(),
            attention: self
                .layer_named(selection.layer, "attention_output")?
                .clone(),
            mlp: self.layer_named(selection.layer, "mlp_output")?.clone(),
            logits: logits_trace(output)?,
        })
    }

    pub(crate) fn cached_layer_inputs(&self) -> Vec<Tensor> {
        self.layer_inputs
            .iter()
            .map(|(_, tensor)| tensor.clone())
            .collect()
    }

    fn finish(&mut self) -> Result<(), RuntimeError> {
        self.error.take().map_or_else(|| Ok(()), Err)
    }

    fn named(&self, name: &str) -> Result<&TensorSnapshot, RuntimeError> {
        self.tensors
            .iter()
            .find(|item| item.snapshot.id == name)
            .map(|item| &item.snapshot)
            .ok_or(RuntimeError::InvalidSelector)
    }

    fn layer_named(&self, layer: usize, name: &str) -> Result<&TensorSnapshot, RuntimeError> {
        self.tensors
            .iter()
            .find(|item| item.layer == Some(layer) && item.snapshot.id == name)
            .map(|item| &item.snapshot)
            .ok_or(RuntimeError::InvalidSelector)
    }

    fn layer_count(&self) -> usize {
        self.tensors
            .iter()
            .filter_map(|item| item.layer)
            .max()
            .map_or(0, |layer| layer + 1)
    }
}
