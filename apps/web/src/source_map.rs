//! Typed access to the generated map between pinned nanoGPT and Rust operations.

use std::collections::BTreeMap;

use nanogpt_schema::{OperationId, SourceReference};
use serde::Deserialize;
use thiserror::Error;

/// Pinned nanoGPT commit displayed beside every source range.
pub const NANOGPT_COMMIT: &str = include_str!("../../../reference/NANOGPT_COMMIT");
/// Exact pinned nanoGPT source rendered without a CDN highlighter.
pub const NANOGPT_MODEL_SOURCE: &str = include_str!("../public/reference/model.py");

const SOURCE_MAP_JSON: &str = include_str!("../public/models/edu/source_map.json");

/// One generated Python-to-Rust source correspondence.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SourceMapEntry {
    /// Public static copy of the pinned Python file.
    pub file: String,
    /// Original nanoGPT class and method label.
    pub label: String,
    /// First highlighted one-based line.
    pub line_start: usize,
    /// Last highlighted one-based line.
    pub line_end: usize,
    /// Rust implementation file.
    pub rust_file: String,
    /// Rust implementation symbol.
    pub rust_symbol: String,
    /// Stable operation key.
    pub symbol: String,
}

/// Invalid generated source-map data.
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

/// Loads and validates the canonical generated source entry for an operation.
///
/// # Errors
/// Returns [`SourceMapError`] when the generated map is malformed or out of bounds.
pub fn entry(operation: OperationId) -> Result<SourceMapEntry, SourceMapError> {
    let entries = serde_json::from_str::<BTreeMap<String, SourceMapEntry>>(SOURCE_MAP_JSON)?;
    let key = operation_key(operation);
    let selected = entries
        .get(key)
        .cloned()
        .ok_or(SourceMapError::MissingOperation(key))?;
    let line_count = NANOGPT_MODEL_SOURCE.lines().count();
    if selected.line_start == 0
        || selected.line_end < selected.line_start
        || selected.line_end > line_count
    {
        return Err(SourceMapError::InvalidRange {
            symbol: selected.symbol,
        });
    }
    Ok(selected)
}

/// Builds the shared schema reference from the canonical generated map.
///
/// # Errors
/// Returns [`SourceMapError`] when the generated entry is invalid.
pub fn source_reference(operation: OperationId) -> Result<SourceReference, SourceMapError> {
    let mapped = entry(operation)?;
    Ok(SourceReference {
        file: mapped.file,
        symbol: mapped.label,
        start_line: mapped.line_start,
        end_line: mapped.line_end,
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
