//! Conversion from Candle trace events to bounded Worker response DTOs.

use candle_core::Tensor;
use nanogpt_model::{CausalMask, ForwardOutput, TraceSink, TraceTensor};
use nanogpt_schema::{
    AttentionHeadTrace, BlockTrace, FiniteF32, LayerSummary, LogitCandidate, LogitsTrace,
    MaskSnapshot, MlpTrace, OperationTrace, RunSummary, SchemaVersion, SourceReference,
    TensorSnapshot, TokenInfo, TokenTrace,
};

use crate::runtime_error::RuntimeError;

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
    mask: Option<MaskSnapshot>,
    error: Option<RuntimeError>,
}

impl TraceSink for TraceCapture {
    fn tensor(&mut self, trace: TraceTensor<'_>) {
        if self.error.is_some() {
            return;
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
    ) -> Result<RunSummary, RuntimeError> {
        self.finish()?;
        self.named("embedding_sum")?;
        self.named("final_layer_norm")?;
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
            logits: logits_trace(output)?,
        })
    }

    pub(crate) fn block(mut self, run_id: u64, layer: usize) -> Result<BlockTrace, RuntimeError> {
        self.finish()?;
        let operations = self
            .tensors
            .iter()
            .filter(|item| item.layer == Some(layer))
            .map(|item| OperationTrace {
                operation: item.operation,
                source: source(item.operation),
                output: item.snapshot.stats.clone(),
            })
            .collect();
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
                source: source(nanogpt_schema::OperationId::Mlp),
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
            source: source(nanogpt_schema::OperationId::Attention),
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

    fn finish(&mut self) -> Result<(), RuntimeError> {
        self.error.take().map_or_else(|| Ok(()), Err)
    }

    fn named(&self, name: &str) -> Result<&TensorSnapshot, RuntimeError> {
        self.tensors
            .iter()
            .find(|item| item.snapshot.name == name)
            .map(|item| &item.snapshot)
            .ok_or(RuntimeError::InvalidSelector)
    }

    fn layer_named(&self, layer: usize, name: &str) -> Result<&TensorSnapshot, RuntimeError> {
        self.tensors
            .iter()
            .find(|item| item.layer == Some(layer) && item.snapshot.name == name)
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

#[derive(Debug, Clone, Copy)]
pub struct TokenSelection<'a> {
    pub run_id: u64,
    pub layer: usize,
    pub head: usize,
    pub token: usize,
    pub tokens: &'a [TokenInfo],
}

fn snapshot(name: &str, tensor: &Tensor) -> Result<TensorSnapshot, RuntimeError> {
    let raw = tensor.contiguous()?.flatten_all()?.to_vec1::<f32>()?;
    let values = raw
        .into_iter()
        .map(FiniteF32::new)
        .collect::<Result<Vec<_>, _>>()?;
    Ok(TensorSnapshot::new(
        name.to_owned(),
        tensor.dims().to_vec(),
        values,
    )?)
}

fn logits_trace(output: &ForwardOutput) -> Result<LogitsTrace, RuntimeError> {
    let values = output
        .top_k
        .iter()
        .map(|candidate| FiniteF32::new(candidate.logit))
        .collect::<Result<Vec<_>, _>>()?;
    let logits = TensorSnapshot::new("top_10_logits".to_owned(), vec![values.len()], values)?;
    let top_k = output
        .top_k
        .iter()
        .map(|candidate| {
            Ok(LogitCandidate {
                token_id: candidate.token_id,
                display: token_display(candidate.token_id.0),
                logit: FiniteF32::new(candidate.logit)?,
                probability: FiniteF32::new(candidate.probability)?,
            })
        })
        .collect::<Result<Vec<_>, RuntimeError>>()?;
    Ok(LogitsTrace {
        logits,
        top_k,
        source: source(nanogpt_schema::OperationId::Logits),
    })
}

fn token_display(id: u32) -> String {
    match id {
        0 => "<BOS>".to_owned(),
        1 => "<EOS>".to_owned(),
        2 => "<UNK>".to_owned(),
        3..=258 => {
            char::from_u32(id - 3).map_or_else(|| "<?>".to_owned(), |value| value.to_string())
        }
        _ => "<?>".to_owned(),
    }
}

fn source(operation: nanogpt_schema::OperationId) -> SourceReference {
    SourceReference {
        file: "reference/nanoGPT/model.py".to_owned(),
        line_start: 1,
        line_end: 1,
        symbol: format!("{operation:?}"),
    }
}
