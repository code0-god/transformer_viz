//! Exact generated-token evidence, deliberately separate from Sample interval evidence.

use crate::app::{narrative::NarrativeStage, state::AppState, ui_state::ExplorerMode};
use leptos::prelude::*;

pub(super) fn is_focus(state: &AppState) -> bool {
    state.ui.mode == ExplorerMode::Guided
        && state.ui.narrative.stage == NarrativeStage::GeneratedToken
}

pub(super) fn evidence(state: &AppState, inspector: bool) -> AnyView {
    let Some(index) = state.generation.selected_step else {
        return empty("생성된 토큰을 선택하면 정확한 token evidence를 표시합니다.");
    };
    let Some(step) = state.generation.steps.get(index) else {
        return empty("선택한 생성 step이 compact history에 없습니다.");
    };
    let token = &step.generated_token;
    view! {
        <div class="generated-token-evidence" data-testid=if inspector { "inspector-generated-token" } else { "evidence-generated-token" } data-step-index=index data-token-id=token.id.0>
            <small>"selected generated token"</small>
            <strong>{token.display.clone()}</strong>
            <code>{format!("ID {}", token.id.0)}</code>
            <span>{format!("bytes {:?}", token.piece)}</span>
            <p>"이 증거는 Sample random interval이 아니라 TokenGenerated가 확정한 ID/display/bytes입니다."</p>
        </div>
    }.into_any()
}

fn empty(message: &'static str) -> AnyView {
    view! { <p class="stage-empty" role="status">{message}</p> }.into_any()
}
