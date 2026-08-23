//! Compact Architecture-First header.

use leptos::prelude::*;

use crate::app::state::{AppState, AppStatus};

#[must_use]
pub(super) fn architecture_header(state: RwSignal<AppState>) -> impl IntoView {
    view! {
        <header class="architecture-header">
            <div class="brand-lockup">
                <h1>"Transformer Viz"</h1>
                <p>"GPT형 Transformer가 텍스트를 생성하는 과정을 탐색합니다."</p>
            </div>
            <div
                class=move || state.with(|current| if matches!(current.status, AppStatus::Error(_)) {
                    "lifecycle lifecycle-error"
                } else {
                    "lifecycle"
                })
                role=move || state.with(|current| if matches!(current.status, AppStatus::Error(_)) {
                    "alert"
                } else {
                    "status"
                })
                aria-live=move || state.with(|current| if matches!(current.status, AppStatus::Error(_)) {
                    "assertive"
                } else {
                    "polite"
                })
            >
                <span
                    id="status"
                    class="status-badge"
                    data-status=move || state.with(|current| status_kind(&current.status))
                >
                    {move || state.with(|current| status_label(&current.status))}
                </span>
                <span
                    class="lifecycle-detail"
                    hidden=move || state.with(|current| !matches!(current.status, AppStatus::Error(_)))
                >
                    {move || state.with(|current| match &current.status {
                        AppStatus::Error(message) => message.clone(),
                        AppStatus::Loading(_)
                        | AppStatus::Ready
                        | AppStatus::Running(_)
                        | AppStatus::Complete => String::new(),
                    })}
                </span>
            </div>
        </header>
    }
}

const fn status_kind(status: &AppStatus) -> &'static str {
    match status {
        AppStatus::Loading(_) => "loading",
        AppStatus::Ready => "ready",
        AppStatus::Running(_) => "running",
        AppStatus::Complete => "complete",
        AppStatus::Error(_) => "error",
    }
}

const fn status_label(status: &AppStatus) -> &'static str {
    match status {
        AppStatus::Loading(_) => "Model Loading",
        AppStatus::Ready | AppStatus::Complete => "Model Ready",
        AppStatus::Running(_) => "Generating",
        AppStatus::Error(_) => "Model Error",
    }
}
