//! Deterministic, educational UTF-8 byte-fallback tokenizer.

use nanogpt_schema::{EncodedTokens, TokenId, TokenInfo, TokenKind, TokenizerConfig};
use thiserror::Error;

/// A validated deterministic tokenizer.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Tokenizer {
    config: TokenizerConfig,
}

/// Errors produced while loading, encoding, or decoding tokens.
#[derive(Debug, Error)]
#[non_exhaustive]
pub enum TokenizerError {
    /// JSON configuration could not be decoded.
    #[error("invalid tokenizer JSON: {0}")]
    Json(#[from] serde_json::Error),
    /// Tokenizer configuration violates an ID or length invariant.
    #[error("invalid tokenizer configuration: {0}")]
    Config(#[from] nanogpt_schema::SchemaError),
    /// A byte token has an ID outside the configured byte range.
    #[error("token ID {0} is not a configured byte token")]
    InvalidByteToken(u32),
    /// Decoded token pieces are not valid UTF-8.
    #[error("decoded token bytes are not valid UTF-8: {0}")]
    Utf8(#[from] std::string::FromUtf8Error),
}

impl Tokenizer {
    /// Validates and constructs a tokenizer configuration.
    ///
    /// # Errors
    /// Returns [`TokenizerError`] when IDs overlap or the sequence limit is too small.
    pub fn new(config: TokenizerConfig) -> Result<Self, TokenizerError> {
        config.validate()?;
        Ok(Self { config })
    }

    /// Parses and validates a compact JSON tokenizer configuration.
    ///
    /// # Errors
    /// Returns [`TokenizerError`] for malformed JSON or invalid IDs and limits.
    pub fn from_json(json: &str) -> Result<Self, TokenizerError> {
        Self::new(serde_json::from_str::<TokenizerConfig>(json)?)
    }

    /// Returns the validated configuration.
    #[must_use]
    pub const fn config(&self) -> &TokenizerConfig {
        &self.config
    }

    /// Encodes UTF-8 bytes, preserving BOS/EOS within the configured maximum.
    #[must_use]
    pub fn encode(&self, input: &str) -> EncodedTokens {
        let content_limit = self.config.max_length - 2;
        let mut kept = input.len().min(content_limit);
        while !input.is_char_boundary(kept) {
            kept -= 1;
        }
        let mut tokens = Vec::with_capacity(kept + 2);
        tokens.push(special(self.config.bos_id, "<BOS>", TokenKind::Bos));
        for (offset, byte) in input.as_bytes()[..kept].iter().copied().enumerate() {
            tokens.push(TokenInfo {
                id: TokenId(self.config.byte_offset + u32::from(byte)),
                display: display_byte(byte),
                piece: vec![byte],
                byte_start: Some(offset),
                byte_end: Some(offset + 1),
                kind: TokenKind::Byte,
            });
        }
        tokens.push(special(self.config.eos_id, "<EOS>", TokenKind::Eos));
        EncodedTokens {
            tokens,
            truncated: kept < input.len(),
            original_byte_length: input.len(),
        }
    }

    /// Decodes byte tokens and omits BOS/EOS markers.
    ///
    /// # Errors
    /// Returns [`TokenizerError`] for invalid IDs or invalid UTF-8 token sequences.
    pub fn decode(&self, tokens: &[TokenInfo]) -> Result<String, TokenizerError> {
        let mut bytes = Vec::with_capacity(tokens.len());
        for token in tokens {
            match token.kind {
                TokenKind::Bos | TokenKind::Eos => {}
                TokenKind::Unknown => bytes.extend_from_slice("�".as_bytes()),
                TokenKind::Byte => {
                    let Some(byte) = token
                        .id
                        .0
                        .checked_sub(self.config.byte_offset)
                        .and_then(|value| u8::try_from(value).ok())
                    else {
                        return Err(TokenizerError::InvalidByteToken(token.id.0));
                    };
                    bytes.push(byte);
                }
            }
        }
        Ok(String::from_utf8(bytes)?)
    }
}

fn special(id: TokenId, display: &str, kind: TokenKind) -> TokenInfo {
    TokenInfo {
        id,
        display: display.to_owned(),
        piece: Vec::new(),
        byte_start: None,
        byte_end: None,
        kind,
    }
}

fn display_byte(byte: u8) -> String {
    match byte {
        b' ' => "␠".to_owned(),
        b'\n' => "\\n".to_owned(),
        b'\r' => "\\r".to_owned(),
        b'\t' => "\\t".to_owned(),
        0x21..=0x7e => char::from(byte).to_string(),
        _ => format!("0x{byte:02X}"),
    }
}
