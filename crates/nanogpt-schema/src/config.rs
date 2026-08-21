use crate::{SchemaError, SchemaVersion, TokenId};
use serde::{Deserialize, Serialize};

/// Static asset location and integrity metadata.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AssetDescriptor {
    /// Base-relative URL.
    pub url: String,
    /// Lowercase SHA-256 digest.
    pub sha256: String,
    /// Expected byte size.
    pub size_bytes: u64,
}

/// nanoGPT architecture parameters required for inference.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelConfig {
    /// Maximum sequence length.
    pub block_size: usize,
    /// Vocabulary size.
    pub vocab_size: usize,
    /// Transformer block count.
    pub layer_count: usize,
    /// Attention head count.
    pub head_count: usize,
    /// Residual width.
    pub embedding_size: usize,
    /// Whether layers include bias.
    pub has_bias: bool,
}

impl ModelConfig {
    /// Checks dimensions needed for tensor construction.
    ///
    /// # Errors
    /// Returns [`SchemaError`] for zero or incompatible dimensions.
    pub fn validate(&self) -> Result<(), SchemaError> {
        for (field, value) in [
            ("block_size", self.block_size),
            ("vocab_size", self.vocab_size),
            ("layer_count", self.layer_count),
            ("head_count", self.head_count),
            ("embedding_size", self.embedding_size),
        ] {
            if value == 0 {
                return Err(SchemaError::ZeroValue { field });
            }
        }
        if !self.embedding_size.is_multiple_of(self.head_count) {
            return Err(SchemaError::EmbeddingNotDivisible {
                embedding_size: self.embedding_size,
                head_count: self.head_count,
            });
        }
        Ok(())
    }
}

/// Human-readable model identity and provenance.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelMetadata {
    /// Display name.
    pub name: String,
    /// Training corpus description.
    pub corpus: String,
    /// Pinned nanoGPT source commit.
    pub nanogpt_commit: String,
    /// Learned parameter count.
    pub parameter_count: u64,
}

/// Deterministic tokenizer algorithm identifier.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TokenizerKind {
    /// One token per UTF-8 byte.
    ByteFallbackV1,
}

/// Compact tokenizer configuration loaded from JSON.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TokenizerConfig {
    /// Algorithm.
    pub kind: TokenizerKind,
    /// Beginning token.
    pub bos_id: TokenId,
    /// Ending token.
    pub eos_id: TokenId,
    /// Reserved unknown token.
    pub unk_id: TokenId,
    /// Offset added to byte values.
    pub byte_offset: u32,
    /// Limit including special tokens.
    pub max_length: usize,
}

impl TokenizerConfig {
    /// Creates the canonical Python-compatible configuration.
    #[must_use]
    pub const fn byte_fallback(max_length: usize) -> Self {
        Self {
            kind: TokenizerKind::ByteFallbackV1,
            bos_id: TokenId(0),
            eos_id: TokenId(1),
            unk_id: TokenId(2),
            byte_offset: 3,
            max_length,
        }
    }

    /// Checks ID ranges and sequence bounds.
    ///
    /// # Errors
    /// Returns [`SchemaError`] when IDs overlap or the limit is too small.
    pub fn validate(&self) -> Result<(), SchemaError> {
        if self.max_length < 2 {
            return Err(SchemaError::SequenceTooShort(self.max_length));
        }
        let ids = [self.bos_id.0, self.eos_id.0, self.unk_id.0];
        if ids[0] == ids[1] || ids[0] == ids[2] || ids[1] == ids[2] {
            return Err(SchemaError::DuplicateSpecialToken);
        }
        let last = self.byte_offset.saturating_add(u32::from(u8::MAX));
        for token_id in ids {
            if (self.byte_offset..=last).contains(&token_id) {
                return Err(SchemaError::SpecialTokenOverlapsBytes {
                    token_id,
                    first_byte_id: self.byte_offset,
                    last_byte_id: last,
                });
            }
        }
        Ok(())
    }
}

/// Top-level static model manifest.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelManifest {
    /// Contract version.
    pub schema_version: SchemaVersion,
    /// Model identity.
    pub metadata: ModelMetadata,
    /// Architecture.
    pub model: ModelConfig,
    /// Tokenizer asset.
    pub tokenizer: AssetDescriptor,
    /// Safetensors asset.
    pub weights: AssetDescriptor,
}
