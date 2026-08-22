//! Exact curriculum copy and operation-focused Explore copy.

mod curriculum;
mod operation;

use crate::app::{state::AppState, ui_state::ExplorerMode};
pub(super) use curriculum::stage_copy;
pub(super) use operation::operation_label;

#[derive(Clone, Copy)]
pub(super) struct StageCopy {
    pub title: &'static str,
    pub purpose: &'static str,
    pub formula: &'static str,
    pub bridge: &'static str,
}

const fn c(
    title: &'static str,
    purpose: &'static str,
    formula: &'static str,
    bridge: &'static str,
) -> StageCopy {
    StageCopy {
        title,
        purpose,
        formula,
        bridge,
    }
}

pub(super) fn focus_title(state: &AppState) -> &'static str {
    focus_copy(state).title
}
pub(super) fn focus_purpose(state: &AppState) -> &'static str {
    focus_copy(state).purpose
}
pub(super) fn focus_formula(state: &AppState) -> &'static str {
    focus_copy(state).formula
}
pub(super) fn focus_bridge(state: &AppState) -> &'static str {
    focus_copy(state).bridge
}

fn focus_copy(state: &AppState) -> StageCopy {
    if state.ui.mode == ExplorerMode::Guided {
        curriculum::stage_copy(state.ui.narrative.stage)
    } else {
        state.ui.architecture.operation.map_or_else(
            || operation::level_copy(state.ui.architecture.level),
            operation::operation_copy,
        )
    }
}
