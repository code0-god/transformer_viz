//! Architecture-first GPT overview backed by loaded model metadata.

use leptos::prelude::*;
mod diagram;

use diagram::ready_architecture;

use crate::app::state::{AppState, AppStatus};

#[must_use]
pub(super) fn architecture_overview(state: RwSignal<AppState>) -> impl IntoView {
    view! {
        <section
            id="architecture-canvas"
            class="architecture-shell"
            data-testid="architecture-shell"
            aria-labelledby="architecture-title"
        >
            <div class="architecture-intro">
                <div>
                    <h2 id="architecture-title">"GPT Architecture"</h2>
                    <p>
                        "입력 context가 Transformer를 거쳐 다음 토큰이 되고, 새 토큰은 다시 context에 추가됩니다."
                    </p>
                </div>
            </div>
            {move || {
                let (model, error) = state.with(|current| {
                    let error = match &current.status {
                        AppStatus::Error(message) => Some(message.clone()),
                        AppStatus::Loading(_)
                        | AppStatus::Ready
                        | AppStatus::Running(_)
                        | AppStatus::Complete => None,
                    };
                    (current.model.clone(), error)
                });
                model.map_or_else(
                    || error.map_or_else(
                        || view! {
                            <div class="architecture-loading" role="status">
                                <span class="architecture-loading-mark" aria-hidden="true"></span>
                                <p>"모델 구조를 불러오는 중입니다."</p>
                            </div>
                        }.into_any(),
                        |message| view! {
                            <p class="architecture-error" role="alert">{message}</p>
                        }.into_any(),
                    ),
                    |model| ready_architecture(&model),
                )
            }}
        </section>
    }
}
