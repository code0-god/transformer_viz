//! Versioned shared contracts for model assets, traces, and Worker messages.

mod config;
mod generation;
mod protocol;
mod tensor;
mod token;
mod trace;

pub use config::{
    AssetDescriptor, GptConfig, ModelManifest, ModelMetadata, TokenizerConfig, TokenizerKind,
};
pub use generation::{GenerationConfig, SamplingMode, Temperature, TopK};
pub use protocol::{WorkerErrorCode, WorkerRequest, WorkerResponse};
pub use tensor::{FiniteF32, MaskSnapshot, TensorSnapshot, TensorStats};
pub use token::{EncodedTokens, TokenId, TokenInfo, TokenKind};
pub use trace::{
    AttentionHeadTrace, BlockTrace, EmbeddingTrace, LayerSummary, LogitCandidate, LogitsTrace,
    MlpTrace, OperationId, OperationTrace, RunSummary, SourceReference, TokenTrace, TraceMode,
};

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Current serialized trace and Worker protocol version.
pub const TRACE_SCHEMA_VERSION: &str = "1.1.0";

/// A schema version proven to match this build.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(try_from = "String", into = "String")]
pub struct SchemaVersion;

impl SchemaVersion {
    /// Returns the version supported by this build.
    #[must_use]
    pub const fn current() -> Self {
        Self
    }
}

impl TryFrom<String> for SchemaVersion {
    type Error = SchemaError;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        if value == TRACE_SCHEMA_VERSION {
            Ok(Self)
        } else {
            Err(SchemaError::UnsupportedVersion(value))
        }
    }
}

impl From<SchemaVersion> for String {
    fn from(_: SchemaVersion) -> Self {
        TRACE_SCHEMA_VERSION.to_owned()
    }
}

/// Invalid serialized or configured schema data.
#[derive(Debug, Error, PartialEq, Eq)]
#[non_exhaustive]
pub enum SchemaError {
    /// A message or trace uses another schema version.
    #[error("unsupported schema version '{0}'; expected {TRACE_SCHEMA_VERSION}")]
    UnsupportedVersion(String),
    /// Sampling temperature is zero, negative, NaN, or infinite.
    #[error("temperature must be positive and finite")]
    InvalidTemperature,
    /// A required numeric configuration field is zero.
    #[error("{field} must be greater than zero")]
    ZeroValue {
        /// Name of the invalid field.
        field: &'static str,
    },
    /// The attention heads cannot evenly partition the embedding.
    #[error("embedding size {embedding_size} is not divisible by {head_count} attention heads")]
    EmbeddingNotDivisible {
        /// Configured embedding width.
        embedding_size: usize,
        /// Configured head count.
        head_count: usize,
    },
    /// Special token IDs overlap.
    #[error("BOS, EOS, and UNK token IDs must be distinct")]
    DuplicateSpecialToken,
    /// A special token overlaps the byte-token range.
    #[error("special token ID {token_id} overlaps byte-token IDs {first_byte_id}..={last_byte_id}")]
    SpecialTokenOverlapsBytes {
        /// Invalid special ID.
        token_id: u32,
        /// First byte ID.
        first_byte_id: u32,
        /// Last byte ID.
        last_byte_id: u32,
    },
    /// The sequence cannot hold BOS and EOS.
    #[error("maximum token length {0} must reserve at least BOS and EOS")]
    SequenceTooShort(usize),
    /// A tensor value is not finite f32.
    #[error("tensor values must be finite f32 numbers")]
    NonFiniteTensorValue,
    /// Tensor statistics are undefined for an empty snapshot.
    #[error("tensor snapshot must contain at least one value")]
    EmptyTensor,
    /// Tensor dimensions and values disagree.
    #[error("tensor shape requires {expected} values but received {actual}")]
    TensorLength {
        /// Shape element count.
        expected: usize,
        /// Actual value count.
        actual: usize,
    },
    /// Mask dimensions and values disagree.
    #[error("attention mask shape requires {expected} cells but received {actual}")]
    MaskLength {
        /// Shape cell count.
        expected: usize,
        /// Actual cell count.
        actual: usize,
    },
}
