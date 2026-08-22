//! Focused tests for architecture catalog, navigation, and request policy.

#[path = "architecture_tests"]
#[cfg(test)]
mod tests {
    use std::error::Error;

    use nanogpt_schema::{GptConfig, ModelMetadata, WorkerRequest};

    type TestResult = Result<(), Box<dyn Error>>;

    use crate::app::{
        architecture::{
            ArchitectureLevel, ArchitectureMapState, ArchitectureNodeKind, ArchitectureOperation,
            SummaryEvidence, catalog,
        },
        narrative::NarrativeStage,
        state::AppState,
        state_test_fixtures::run_summary,
        ui_state::{ExplorerMode, ExplorerUiState},
    };

    fn config() -> GptConfig {
        GptConfig {
            block_size: 24,
            vocab_size: 259,
            n_layer: 3,
            n_head: 4,
            n_embd: 64,
            bias: true,
        }
    }

    fn model() -> ModelMetadata {
        ModelMetadata {
            name: "test".to_owned(),
            corpus: "test".to_owned(),
            nanogpt_commit: "test".to_owned(),
            parameter_count: 1,
            config: config(),
        }
    }

    mod catalog_contract;
    mod navigation;
}
