//! Pure browser-only state for one shared Guided/Explore focus.

#[cfg(test)]
mod detail;

#[cfg(test)]
use super::architecture::{ArchitectureMapState, ArchitectureNodeKind, ArchitectureOperation};
use super::architecture_overview::ArchitectureOverviewState;
#[cfg(test)]
use super::narrative::{NarrativePlayback, NarrativeSpeed, NarrativeStage};
#[cfg(test)]
use detail::representative_detail;

#[cfg(test)]
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
/// Active writer for the single shared focus.
pub enum ExplorerMode {
    #[default]
    /// Curriculum-led focus writing.
    Guided,
    /// Architecture-led focus writing.
    Explore,
}

#[cfg(test)]
impl ExplorerMode {
    #[must_use]
    /// Resolves Arrow, Home, and End roving-focus commands.
    pub fn after_key(self, key: &str) -> Option<Self> {
        match key {
            "Home" => Some(Self::Guided),
            "End" => Some(Self::Explore),
            "ArrowLeft" | "ArrowRight" => Some(match self {
                Self::Guided => Self::Explore,
                Self::Explore => Self::Guided,
            }),
            _ => None,
        }
    }
}

#[cfg(test)]
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
/// Inspector panel selected by its roving tablist.
pub enum InspectorTab {
    #[default]
    /// Plain-language focus explanation.
    Explanation,
    /// Exact trace tensor evidence.
    Tensor,
    /// Pinned source correspondence.
    Source,
}

#[cfg(test)]
impl InspectorTab {
    #[must_use]
    /// Resolves Arrow, Home, and End roving-focus commands.
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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
/// Browser-only mode, focus, transport, and Inspector state.
pub struct ExplorerUiState {
    #[cfg(test)]
    /// Current Guided or Explore writer.
    pub mode: ExplorerMode,
    /// Independent first-screen architecture navigation.
    pub architecture_overview: ArchitectureOverviewState,
    #[cfg(test)]
    /// Shared curriculum cursor and playback transport.
    pub narrative: NarrativePlayback,
    #[cfg(test)]
    /// Shared architecture level, coordinates, and operation.
    pub(crate) architecture: ArchitectureMapState,
    #[cfg(test)]
    /// Inspector panel selected by its roving tablist.
    pub inspector_tab: InspectorTab,
    /// Whether prompt editing controls are expanded.
    pub prompt_expanded: bool,
    #[cfg(test)]
    /// Whether the Architecture Map disclosure is expanded.
    pub model_map_expanded: bool,
    #[cfg(test)]
    /// Feature coordinate highlighted in evidence views.
    pub selected_feature: usize,
    #[cfg(test)]
    /// Selected legacy detail index, if valid for the focus.
    pub detail_operation: Option<usize>,
}

impl Default for ExplorerUiState {
    fn default() -> Self {
        let state = Self {
            #[cfg(test)]
            mode: ExplorerMode::Guided,
            architecture_overview: ArchitectureOverviewState::default(),
            #[cfg(test)]
            narrative: NarrativePlayback::default(),
            #[cfg(test)]
            architecture: ArchitectureMapState::default(),
            #[cfg(test)]
            inspector_tab: InspectorTab::Explanation,
            prompt_expanded: true,
            #[cfg(test)]
            model_map_expanded: false,
            #[cfg(test)]
            selected_feature: 0,
            #[cfg(test)]
            detail_operation: None,
        };
        #[cfg(test)]
        {
            let mut state = state;
            state.sync_guided_focus();
            state
        }
        #[cfg(not(test))]
        {
            state
        }
    }
}

#[cfg(test)]
impl ExplorerUiState {
    /// Mode changes preserve the shared focus and all evidence coordinates.
    pub const fn select_mode(&mut self, mode: ExplorerMode) {
        self.mode = mode;
        #[cfg(test)]
        if matches!(mode, ExplorerMode::Guided) && self.architecture.operation.is_none() {
            self.sync_guided_focus();
        } else {
            self.canonicalize_detail();
        }
    }

    /// Curriculum is a Guided writer over the shared focus.
    pub const fn select_stage(&mut self, stage: NarrativeStage) {
        self.mode = ExplorerMode::Guided;
        self.narrative.select(stage);
        self.sync_guided_focus();
    }

    /// Architecture Map is an Explore writer over the same focus.
    #[cfg(test)]
    /// Writes an Explore level, coordinate, or operation focus.
    pub(crate) const fn navigate_architecture(&mut self, node: ArchitectureNodeKind) {
        self.mode = ExplorerMode::Explore;
        self.architecture.navigate(node);
        if let ArchitectureNodeKind::Operation(operation) = node {
            self.narrative.select(operation.concept());
        }
        self.canonicalize_detail();
    }

    /// Moves to the previous concept as Guided navigation.
    pub const fn previous_stage(&mut self) {
        self.mode = ExplorerMode::Guided;
        self.narrative.previous();
        self.sync_guided_focus();
    }
    /// Moves to the next concept as Guided navigation.
    pub const fn next_stage(&mut self) {
        self.mode = ExplorerMode::Guided;
        self.narrative.next();
        self.sync_guided_focus();
    }
    /// Starts or pauses Guided autoplay.
    pub const fn toggle_narrative(&mut self) {
        self.mode = ExplorerMode::Guided;
        self.narrative.toggle();
        self.sync_guided_focus();
    }
    /// Changes the deterministic Guided playback rate.
    pub const fn set_narrative_speed(&mut self, speed: NarrativeSpeed) {
        self.narrative.set_speed(speed);
    }
    /// Advances Guided autoplay and synchronizes shared focus.
    pub const fn tick_narrative(&mut self) {
        self.narrative.tick();
        self.sync_guided_focus();
    }

    #[must_use]
    /// Clamps and stores a feature coordinate for a real tensor width.
    pub fn select_feature(&mut self, feature: usize, width: usize) -> Option<usize> {
        let selected = width.checked_sub(1).map(|last| feature.min(last))?;
        self.selected_feature = selected;
        Some(selected)
    }

    const fn sync_guided_focus(&mut self) {
        #[cfg(test)]
        {
            let (level, operation) = ArchitectureOperation::for_concept(self.narrative.stage);
            self.architecture.level = level;
            self.architecture.operation = Some(operation);
        }
        self.detail_operation = representative_detail(self.narrative.stage);
    }
}
