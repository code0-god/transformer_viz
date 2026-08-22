//! Generation form, stream, and replay state contracts.

#[path = "generation_tests"]
#[cfg(test)]
mod tests {
    use std::{error::Error, io};

    use nanogpt_schema::{
        FiniteF32, GenerationConfig, GenerationStepSummary, GenerationStopReason, SamplingMode,
        Temperature, TokenId, TokenInfo, TokenKind, TopK, WorkerErrorCode, WorkerRequest,
        WorkerResponse,
    };

    use crate::app::{
        generation::{GenerationForm, GenerationPhase},
        state::AppState,
        state_test_fixtures::{block_response, run_summary},
    };

    type TestResult = Result<(), Box<dyn Error>>;

    fn token(id: u32, display: &str, piece: &[u8], kind: TokenKind) -> TokenInfo {
        TokenInfo {
            id: TokenId(id),
            display: display.to_owned(),
            piece: piece.to_vec(),
            byte_start: None,
            byte_end: None,
            kind,
        }
    }

    fn config() -> Result<GenerationConfig, nanogpt_schema::SchemaError> {
        Ok(GenerationConfig {
            max_new_tokens: 8,
            temperature: Temperature::new(1.0)?,
            top_k: TopK::new(20)?,
            mode: SamplingMode::Sample,
            seed: 42,
        })
    }

    fn step(
        index: usize,
        piece: &[u8],
    ) -> Result<GenerationStepSummary, nanogpt_schema::SchemaError> {
        Ok(GenerationStepSummary {
            index,
            context_token_ids: vec![TokenId(0), TokenId(119), TokenId(1)],
            generated_token: token(
                200 + u32::try_from(index).unwrap_or(u32::MAX),
                "raw",
                piece,
                TokenKind::Byte,
            ),
            selected_logit: FiniteF32::new(2.0)?,
            selected_probability: FiniteF32::new(0.5)?,
            candidates: Vec::new(),
            random: None,
            selected_interval: None,
            forward_ms: FiniteF32::new(1.0)?,
            sampling_ms: FiniteF32::new(0.25)?,
            total_ms: FiniteF32::new(1.25)?,
        })
    }

    fn started(
        request_id: u64,
        run_id: u64,
    ) -> Result<WorkerResponse, nanogpt_schema::SchemaError> {
        Ok(WorkerResponse::GenerationStarted {
            request_id,
            run_id,
            prompt_tokens: vec![
                token(0, "<BOS>", &[], TokenKind::Bos),
                token(119, "t", b"t", TokenKind::Byte),
            ],
            config: config()?,
            context_limit: 24,
        })
    }

    mod completion;
    mod form_and_start;
    mod replay_errors;
    mod replay_selection;
    mod stream;
}
