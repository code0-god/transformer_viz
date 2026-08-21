use serde::{Deserialize, Serialize};

/// Stable token identifier shared with Python fixtures.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct TokenId(pub u32);

/// Semantic role of an encoded token.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TokenKind {
    /// Beginning marker.
    Bos,
    /// Original UTF-8 byte.
    Byte,
    /// Ending marker.
    Eos,
    /// Reserved unknown marker.
    Unknown,
}

/// One educational token with display and original source bytes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TokenInfo {
    /// Vocabulary ID.
    pub id: TokenId,
    /// Human-readable label.
    pub display: String,
    /// Exact original bytes.
    pub piece: Vec<u8>,
    /// Original start byte.
    pub byte_start: Option<usize>,
    /// Original exclusive end byte.
    pub byte_end: Option<usize>,
    /// Semantic role.
    pub kind: TokenKind,
}

/// Tokenizer output and truncation status.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct EncodedTokens {
    /// Sequence tokens.
    pub tokens: Vec<TokenInfo>,
    /// Whether input was shortened.
    pub truncated: bool,
    /// Original input byte length.
    pub original_byte_length: usize,
}

impl EncodedTokens {
    /// Copies model IDs in sequence order.
    #[must_use]
    pub fn ids(&self) -> Vec<TokenId> {
        self.tokens.iter().map(|token| token.id).collect()
    }
}
