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

/// nanoGPT architecture parameters using upstream configuration names.
#[cfg_attr(feature = "typescript-bindings", derive(ts_rs::TS))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct GptConfig {
    /// Maximum sequence length.
    pub block_size: usize,
    /// Vocabulary size.
    pub vocab_size: usize,
    /// Transformer block count.
    pub n_layer: usize,
    /// Attention head count.
    pub n_head: usize,
    /// Residual embedding width.
    pub n_embd: usize,
    /// Whether linear and normalization layers include bias.
    pub bias: bool,
}

impl GptConfig {
    /// Checks dimensions needed for tensor construction.
    ///
    /// # Errors
    /// Returns [`SchemaError`] for zero or incompatible dimensions.
    pub fn validate(&self) -> Result<(), SchemaError> {
        for (field, value) in [
            ("block_size", self.block_size),
            ("vocab_size", self.vocab_size),
            ("n_layer", self.n_layer),
            ("n_head", self.n_head),
            ("n_embd", self.n_embd),
        ] {
            if value == 0 {
                return Err(SchemaError::ZeroValue { field });
            }
        }
        if !self.n_embd.is_multiple_of(self.n_head) {
            return Err(SchemaError::EmbeddingNotDivisible {
                embedding_size: self.n_embd,
                head_count: self.n_head,
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
    /// Loaded model architecture parameters.
    pub config: GptConfig,
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
        let last = self.byte_offset.checked_add(u32::from(u8::MAX)).ok_or(
            SchemaError::ByteTokenRangeOverflow {
                byte_offset: self.byte_offset,
            },
        )?;
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
    /// Binding contract version.
    pub schema_version: SchemaVersion,
    /// Stable model identifier.
    pub model_id: String,
    /// Human-readable model name.
    pub display_name: String,
    /// Reference architecture family.
    pub architecture: String,
    /// Stored tensor data type.
    pub dtype: String,
    /// Base-relative safetensors filename.
    pub weights_file: String,
    /// Lowercase SHA-256 digest of the safetensors file.
    pub weights_sha256: String,
    /// Exact safetensors byte size.
    pub weights_size_bytes: u64,
    /// Base-relative model configuration filename.
    pub config_file: String,
    /// Lowercase SHA-256 digest of the raw configuration file.
    pub config_sha256: String,
    /// Exact configuration byte size.
    pub config_size_bytes: u64,
    /// Base-relative tokenizer configuration filename.
    pub tokenizer_file: String,
    /// Lowercase SHA-256 digest of the raw tokenizer file.
    pub tokenizer_sha256: String,
    /// Exact tokenizer byte size.
    pub tokenizer_size_bytes: u64,
    /// Pinned upstream nanoGPT commit.
    pub nanogpt_commit: String,
    /// Learned parameter count.
    pub parameter_count: u64,
    /// Maximum supported token count.
    pub max_sequence_length: usize,
    /// SPDX asset license identifier.
    pub license: String,
}

impl ModelManifest {
    /// Maximum accepted manifest size at the network boundary.
    pub const MAX_MANIFEST_BYTES: u64 = 16 * 1024;
    /// Maximum accepted model configuration size.
    pub const MAX_CONFIG_BYTES: u64 = 64 * 1024;
    /// Maximum accepted tokenizer configuration size.
    pub const MAX_TOKENIZER_BYTES: u64 = 1024 * 1024;
    /// Maximum accepted educational weights size.
    pub const MAX_WEIGHTS_BYTES: u64 = 8 * 1024 * 1024;

    /// Validates the fixed educational model identity and complete asset descriptors.
    ///
    /// # Errors
    /// Returns [`SchemaError`] for an unexpected identity, filename, digest, or size.
    pub fn validate(&self) -> Result<(), SchemaError> {
        for (valid, detail) in [
            (self.model_id == "nanogpt-edu", "model_id"),
            (
                self.display_name == "nanoGPT Educational Model",
                "display_name",
            ),
            (self.architecture == "nanogpt-compatible", "architecture"),
            (self.dtype == "f32", "dtype"),
            (self.weights_file == "model.safetensors", "weights_file"),
            (self.config_file == "config.json", "config_file"),
            (self.tokenizer_file == "tokenizer.json", "tokenizer_file"),
            (self.max_sequence_length == 24, "max_sequence_length"),
            (self.license == "CC0-1.0", "license"),
            (
                self.nanogpt_commit == "3adf61e154c3fe3fca428ad6bc3818b27a3b8291",
                "nanogpt_commit",
            ),
        ] {
            if !valid {
                return Err(SchemaError::InvalidModelManifest(detail));
            }
        }
        for (field, digest) in [
            ("weights_sha256", self.weights_sha256.as_str()),
            ("config_sha256", self.config_sha256.as_str()),
            ("tokenizer_sha256", self.tokenizer_sha256.as_str()),
        ] {
            if digest.len() != 64
                || !digest
                    .bytes()
                    .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
            {
                return Err(SchemaError::InvalidAssetDigest { field });
            }
        }
        for (field, size, maximum) in [
            (
                "weights_size_bytes",
                self.weights_size_bytes,
                Self::MAX_WEIGHTS_BYTES,
            ),
            (
                "config_size_bytes",
                self.config_size_bytes,
                Self::MAX_CONFIG_BYTES,
            ),
            (
                "tokenizer_size_bytes",
                self.tokenizer_size_bytes,
                Self::MAX_TOKENIZER_BYTES,
            ),
        ] {
            if size == 0 || size > maximum {
                return Err(SchemaError::InvalidAssetSize { field, maximum });
            }
        }
        Ok(())
    }
}

#[cfg(all(test, feature = "typescript-bindings"))]
mod typescript_tests {
    use super::GptConfig;
    use ts_rs::{Config, ExportError, TS as _};

    #[test]
    fn gpt_config_typescript_binding_stays_generated() -> Result<(), ExportError> {
        let generated = GptConfig::export_to_string(&Config::default())?;
        let committed =
            include_str!("../../../spikes/react-root-architecture/src/generated/GptConfig.ts");

        let generated_tokens = generated
            .chars()
            .filter(|character| !character.is_whitespace())
            .collect::<String>();
        let committed_tokens = committed
            .chars()
            .filter(|character| !character.is_whitespace())
            .collect::<String>();

        assert_eq!(generated_tokens, committed_tokens);
        Ok(())
    }
}
