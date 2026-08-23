//! Worker adapter for canonical generated source references.

use std::collections::BTreeMap;

use nanogpt_schema::{OperationId, SourceReference};
use serde::Deserialize;
use thiserror::Error;

const NANOGPT_MODEL_SOURCE: &str = include_str!("../../../reference/nanoGPT/model.py");
const SOURCE_MAP_JSON: &str = include_str!("../../web/public/models/edu/source_map.json");

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields)]
struct SourceMapEntry {
    file: String,
    label: String,
    line_start: usize,
    line_end: usize,
    #[serde(rename = "rust_file")]
    _rust_file: String,
    #[serde(rename = "rust_symbol")]
    _rust_symbol: String,
    symbol: String,
}

/// Invalid canonical source-map data.
#[derive(Debug, Error)]
pub enum SourceMapError {
    /// The generated JSON cannot be parsed.
    #[error("source map JSON is invalid: {0}")]
    InvalidJson(#[from] serde_json::Error),
    /// The requested operation is absent.
    #[error("source map does not contain operation '{0}'")]
    MissingOperation(&'static str),
    /// A generated source range falls outside pinned model.py.
    #[error("source range for '{symbol}' is outside pinned model.py")]
    InvalidRange {
        /// Stable operation key.
        symbol: String,
    },
}

/// Builds a schema reference from the canonical source map.
///
/// # Errors
/// Returns [`SourceMapError`] when the canonical entry is malformed or absent.
pub fn source_reference(operation: OperationId) -> Result<SourceReference, SourceMapError> {
    let entries = serde_json::from_str::<BTreeMap<String, SourceMapEntry>>(SOURCE_MAP_JSON)?;
    let key = operation_key(operation);
    let selected = entries
        .get(key)
        .ok_or(SourceMapError::MissingOperation(key))?;
    if selected.line_start == 0
        || selected.line_end < selected.line_start
        || selected.line_end > NANOGPT_MODEL_SOURCE.lines().count()
    {
        return Err(SourceMapError::InvalidRange {
            symbol: selected.symbol.clone(),
        });
    }
    Ok(SourceReference {
        file: selected.file.clone(),
        symbol: selected.label.clone(),
        start_line: selected.line_start,
        end_line: selected.line_end,
    })
}

const fn operation_key(operation: OperationId) -> &'static str {
    match operation {
        OperationId::Embedding => "embedding",
        OperationId::AttentionLayerNorm => "attention_layer_norm",
        OperationId::QueryKeyValue => "query_key_value",
        OperationId::Attention => "attention",
        OperationId::AttentionResidual => "attention_residual",
        OperationId::MlpLayerNorm => "mlp_layer_norm",
        OperationId::Mlp => "mlp",
        OperationId::MlpResidual => "mlp_residual",
        OperationId::FinalLayerNorm => "final_layer_norm",
        OperationId::Logits => "logits",
    }
}
