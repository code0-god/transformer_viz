use candle_core::Tensor;
use candle_nn::Embedding;

use crate::ModelError;

/// Zero-storage language-model head tied to the shared token embedding.
#[derive(Debug, Clone, Copy, Default)]
pub struct TiedLmHead;

impl TiedLmHead {
    /// Creates a zero-storage tied head.
    #[must_use]
    pub const fn new() -> Self {
        Self
    }

    /// Projects hidden states through the shared token embedding transpose.
    ///
    /// # Errors
    /// Returns [`ModelError`] when hidden or embedding dimensions are incompatible.
    pub fn forward(&self, input: &Tensor, wte: &Embedding) -> Result<Tensor, ModelError> {
        let (batch_size, sequence_length, embedding_size) = input.dims3()?;
        let (vocab_size, token_embedding_size) = wte.embeddings().dims2()?;
        if embedding_size != token_embedding_size {
            return Err(ModelError::TiedHeadDimension {
                hidden: embedding_size,
                embedding: token_embedding_size,
            });
        }
        Ok(input
            .reshape((batch_size * sequence_length, embedding_size))?
            .matmul(&wte.embeddings().t()?)?
            .reshape((batch_size, sequence_length, vocab_size))?)
    }
}
