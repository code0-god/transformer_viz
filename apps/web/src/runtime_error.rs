//! Typed production Worker failures.

use nanogpt_schema::WorkerErrorCode;
use thiserror::Error;

/// Errors produced while loading assets or serving an inference request.
#[derive(Debug, Error)]
#[non_exhaustive]
pub enum RuntimeError {
    /// A required model asset could not be fetched.
    #[error("모델 파일을 불러오지 못했습니다: {0}")]
    AssetUnavailable(String),
    /// A model asset is malformed.
    #[error("모델 파일 형식이 올바르지 않습니다: {0}")]
    InvalidAsset(String),
    /// The downloaded weights do not match their manifest digest.
    #[error("모델 파일의 SHA-256 검증에 실패했습니다 (예상 {expected}, 실제 {actual})")]
    ChecksumMismatch {
        /// Manifest digest.
        expected: String,
        /// Computed digest.
        actual: String,
    },
    /// Shared schema conversion failed.
    #[error("추적 데이터가 올바르지 않습니다: {0}")]
    Schema(#[from] nanogpt_schema::SchemaError),
    /// Generated source correspondence is invalid.
    #[error("소스 연결 정보가 올바르지 않습니다: {0}")]
    SourceMap(#[from] crate::source_map::SourceMapError),
    /// Tokenizer loading or encoding failed.
    #[error("토큰 처리에 실패했습니다: {0}")]
    Tokenizer(#[from] nanogpt_tokenizer::TokenizerError),
    /// Model loading or inference failed.
    #[error("모델 실행에 실패했습니다: {0}")]
    Model(#[from] nanogpt_model::ModelError),
    /// Trace materialization failed in Candle.
    #[error("추적 텐서를 읽지 못했습니다: {0}")]
    Tensor(#[from] candle_core::Error),
    /// Final-logit sampling failed.
    #[error("토큰 샘플링에 실패했습니다: {0}")]
    Sampling(#[from] nanogpt_model::SamplingError),
    /// The Worker has not initialized.
    #[error("모델 준비가 끝나지 않았습니다")]
    NotInitialized,
    /// Empty prompts cannot be inferred.
    #[error("입력 문장을 입력해 주세요")]
    EmptyInput,
    /// Input exceeded the model context.
    #[error("입력은 최대 {limit}개 토큰까지 사용할 수 있습니다 (현재 {actual}개)")]
    InputTooLong {
        /// Configured token limit.
        limit: usize,
        /// Submitted token count including special tokens.
        actual: usize,
    },
    /// The requested cached run no longer exists.
    #[error("요청한 실행 기록이 없습니다. 다시 실행해 주세요")]
    StaleRun,
    /// A selector is outside the cached run.
    #[error("선택한 레이어, 헤드 또는 토큰 범위가 올바르지 않습니다")]
    InvalidSelector,
    /// The request was cancelled.
    #[error("요청이 취소되었습니다")]
    Cancelled,
}

impl RuntimeError {
    /// Returns the stable protocol category for this failure.
    #[must_use]
    pub const fn code(&self) -> WorkerErrorCode {
        match self {
            Self::AssetUnavailable(_) | Self::InvalidAsset(_) | Self::SourceMap(_) => {
                WorkerErrorCode::AssetUnavailable
            }
            Self::ChecksumMismatch { .. } => WorkerErrorCode::ChecksumMismatch,
            Self::Schema(_)
            | Self::EmptyInput
            | Self::InputTooLong { .. }
            | Self::InvalidSelector => WorkerErrorCode::InvalidRequest,
            Self::Tokenizer(_) => WorkerErrorCode::Tokenization,
            Self::Model(_) | Self::Tensor(_) | Self::Sampling(_) => WorkerErrorCode::Inference,
            Self::NotInitialized | Self::StaleRun => WorkerErrorCode::NotInitialized,
            Self::Cancelled => WorkerErrorCode::Cancelled,
        }
    }
}
