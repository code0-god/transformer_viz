//! Pure browser-only state for the guided explorer shell.

#[cfg(any(test, target_arch = "wasm32"))]
use super::architecture::{ArchitectureMapState, ArchitectureNodeKind};
use super::narrative::{
    DETAIL_OPERATION_STAGES, NarrativePlayback, NarrativeSpeed, NarrativeStage,
};

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

impl InspectorTab {
    /// Resolves one supported roving-tab keyboard command.
    #[must_use]
    pub fn after_key(self, key: &str) -> Option<Self> {
        match key {
            "Home" => Some(Self::Explanation),
            "End" => Some(Self::Source),
            "ArrowLeft" => Some(match self {
                Self::Explanation => Self::Source,
                Self::Tensor => Self::Explanation,
                Self::Source => Self::Tensor,
            }),
            "ArrowRight" => Some(match self {
                Self::Explanation => Self::Tensor,
                Self::Tensor => Self::Source,
                Self::Source => Self::Explanation,
            }),
            _ => None,
        }
    }
}

/// Pure browser-only state for the guided explorer shell.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ExplorerUiState {
    /// Nine-stage narrative cursor and playback transport.
    pub narrative: NarrativePlayback,
    /// Active architecture hierarchy path and operation.
    #[cfg(any(test, target_arch = "wasm32"))]
    pub(crate) architecture: ArchitectureMapState,
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
            #[cfg(any(test, target_arch = "wasm32"))]
            architecture: ArchitectureMapState::default(),
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
    pub const fn select_stage(&mut self, stage: NarrativeStage) {
        self.narrative.select(stage);
        self.sync_stage_selection();
    }

    /// Selects one hierarchy node and synchronizes existing narrative evidence.
    #[cfg(any(test, target_arch = "wasm32"))]
    pub(crate) const fn navigate_architecture(&mut self, node: ArchitectureNodeKind) {
        self.architecture.navigate(node);
        self.detail_operation = None;
        if let ArchitectureNodeKind::Operation(operation) = node
            && let Some((stage, detail)) = operation.target()
        {
            self.narrative.select(stage);
            self.detail_operation = detail;
        }
    }

    /// Moves to the previous narrative stage without a Worker request.
    pub const fn previous_stage(&mut self) {
        self.narrative.previous();
        self.sync_stage_selection();
    }

    /// Moves to the next narrative stage without a Worker request.
    pub const fn next_stage(&mut self) {
        self.narrative.next();
        self.sync_stage_selection();
    }

    /// Starts or pauses the browser-only narrative clock.
    pub const fn toggle_narrative(&mut self) {
        self.narrative.toggle();
        self.sync_stage_selection();
    }

    /// Changes the browser-only narrative playback speed.
    pub const fn set_narrative_speed(&mut self, speed: NarrativeSpeed) {
        self.narrative.set_speed(speed);
    }

    /// Advances the narrative clock and keeps legacy detail selection aligned.
    pub const fn tick_narrative(&mut self) {
        self.narrative.tick();
        self.sync_stage_selection();
    }

    /// Selects an actual operation only when it belongs to the current stage.
    #[must_use]
    pub fn select_detail_operation(&mut self, index: usize) -> bool {
        if DETAIL_OPERATION_STAGES.get(index) == Some(&self.narrative.stage) {
            self.detail_operation = Some(index);
            true
        } else {
            false
        }
    }

    /// Selects and clamps a feature to the active tensor width.
    #[must_use]
    pub fn select_feature(&mut self, feature: usize, width: usize) -> Option<usize> {
        let selected = width.checked_sub(1).map(|last| feature.min(last))?;
        self.selected_feature = selected;
        Some(selected)
    }

    const fn sync_stage_selection(&mut self) {
        #[cfg(any(test, target_arch = "wasm32"))]
        self.architecture.sync_stage(self.narrative.stage);
        self.detail_operation = match self.narrative.stage {
            NarrativeStage::Embedding
            | NarrativeStage::CausalMask
            | NarrativeStage::Softmax
            | NarrativeStage::LanguageModelHead => None,
            NarrativeStage::AttentionLayerNorm => Some(1),
            NarrativeStage::QueryKeyValue => Some(2),
            NarrativeStage::AttentionScores => Some(6),
            NarrativeStage::ValueAggregation => Some(8),
            NarrativeStage::MlpAndResidual => Some(12),
        };
    }
}
