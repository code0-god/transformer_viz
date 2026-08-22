//! Pure browser-only state for the guided explorer shell.

use super::narrative::{DETAIL_OPERATION_STAGES, NarrativePlayback, NarrativeStage};

/// Inspector content selected beside the main narrative stage.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum InspectorTab {
    /// Plain-language explanation of the selected stage.
    #[default]
    Explanation,
    /// Real tensor values for the selected stage.
    Tensor,
    /// Pinned nanoGPT source corresponding to the selected operation.
    Source,
}

/// Pure browser-only state for the guided explorer shell.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ExplorerUiState {
    /// Nine-stage narrative cursor and playback transport.
    pub narrative: NarrativePlayback,
    /// Active inspector tab.
    pub inspector_tab: InspectorTab,
    /// Whether the prompt editor is expanded.
    pub prompt_expanded: bool,
    /// Whether the model mini-map is expanded.
    pub model_map_expanded: bool,
    /// Feature index highlighted inside the current visualization.
    pub selected_feature: usize,
    /// Optional selected operation in the legacy 18-step detail trace.
    pub detail_operation: Option<usize>,
}

impl Default for ExplorerUiState {
    fn default() -> Self {
        Self {
            narrative: NarrativePlayback::default(),
            inspector_tab: InspectorTab::Explanation,
            prompt_expanded: true,
            model_map_expanded: false,
            selected_feature: 0,
            detail_operation: None,
        }
    }
}

impl ExplorerUiState {
    /// Selects a narrative stage without crossing the Worker boundary.
    pub fn select_stage(&mut self, stage: NarrativeStage) {
        self.narrative.select(stage);
        self.sync_detail_operation();
    }

    /// Moves to the previous narrative stage without a Worker request.
    pub fn previous_stage(&mut self) {
        self.narrative.previous();
        self.sync_detail_operation();
    }

    /// Moves to the next narrative stage without a Worker request.
    pub fn next_stage(&mut self) {
        self.narrative.next();
        self.sync_detail_operation();
    }

    fn sync_detail_operation(&mut self) {
        self.detail_operation = DETAIL_OPERATION_STAGES
            .iter()
            .position(|stage| *stage == self.narrative.stage);
    }
}
