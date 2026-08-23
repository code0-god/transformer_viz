//! Architecture-first GPT overview backed by loaded model metadata.

use leptos::prelude::*;
use wasm_bindgen::JsCast as _;
mod block_detail;
mod diagram;
mod node;

use block_detail::block_detail;
use diagram::ready_architecture;

use crate::app::{
    architecture_overview::{ArchitectureOverviewState, ArchitectureView},
    state::{AppState, AppStatus},
};

#[must_use]
pub(super) fn architecture_overview(state: RwSignal<AppState>) -> impl IntoView {
    view! {
        <section
            id="architecture-canvas"
            class="architecture-shell"
            data-testid="architecture-shell"
            aria-labelledby="architecture-title"
        >
            {move || {
                let (model, error, overview) = state.with(|current| {
                    let error = match &current.status {
                        AppStatus::Error(message) => Some(message.clone()),
                        AppStatus::Loading(_)
                        | AppStatus::Ready
                        | AppStatus::Running(_)
                        | AppStatus::Complete => None,
                    };
                    (
                        current.model.clone(),
                        error,
                        current.ui.architecture_overview,
                    )
                });
                let layer_count = model.as_ref().map_or(0, |model| model.config.n_layer);
                view! {
                    {architecture_breadcrumb(state, overview, layer_count)}
                    {architecture_intro(state, overview.view())}
                    {model.map_or_else(
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
                        |model| match overview.view() {
                            ArchitectureView::Root => {
                                ready_architecture(&model, state, overview)
                            }
                            ArchitectureView::TransformerBlock => {
                                block_detail(&model, state, overview).into_any()
                            }
                        },
                    )}
                }
            }}
        </section>
    }
}

fn architecture_breadcrumb(
    state: RwSignal<AppState>,
    overview: ArchitectureOverviewState,
    layer_count: usize,
) -> impl IntoView {
    let labels = overview.breadcrumb_labels(layer_count);
    view! {
        <nav class="architecture-breadcrumb" aria-label="Architecture navigation">
            <ol>
                <li>
                    {if overview.view() == ArchitectureView::Root {
                        view! {
                            <span
                                class="architecture-breadcrumb-current"
                                data-testid="architecture-breadcrumb-gpt"
                                aria-current="page"
                            >
                                "GPT"
                            </span>
                        }.into_any()
                    } else {
                        view! {
                            <button
                                type="button"
                                data-testid="architecture-breadcrumb-gpt"
                                on:click=move |_| select_root(state)
                            >
                                "GPT"
                            </button>
                        }.into_any()
                    }}
                </li>
                {labels.get(1).map(|label| view! {
                    <li class="architecture-breadcrumb-current">
                        <span aria-hidden="true">"›"</span>
                        <span
                            data-testid="architecture-breadcrumb-block"
                            aria-current="page"
                        >
                            {label.clone()}
                        </span>
                    </li>
                })}
            </ol>
        </nav>
    }
}

fn architecture_intro(state: RwSignal<AppState>, view: ArchitectureView) -> impl IntoView {
    view! {
        <div class="architecture-intro">
            <div>
                <h2 id="architecture-title" tabindex="-1">
                    {match view {
                        ArchitectureView::Root => "GPT Architecture",
                        ArchitectureView::TransformerBlock => "Transformer Block",
                    }}
                </h2>
                <p>
                    {match view {
                        ArchitectureView::Root => {
                            "입력 context가 Transformer를 거쳐 다음 토큰이 되고, 새 토큰은 다시 context에 추가됩니다."
                        }
                        ArchitectureView::TransformerBlock => {
                            "하나의 Pre-LN Decoder Block이 attention과 MLP residual을 계산하는 흐름입니다."
                        }
                    }}
                </p>
            </div>
            {(view == ArchitectureView::TransformerBlock).then(|| view! {
                <button
                    type="button"
                    class="architecture-back-button"
                    data-testid="architecture-back-root"
                    on:click=move |_| select_root(state)
                >
                    "← 전체 구조"
                </button>
            })}
        </div>
    }
}

fn select_root(state: RwSignal<AppState>) {
    state.update(|current| current.ui.architecture_overview.select_root());
    focus_architecture_title();
}

pub(super) fn focus_architecture_title() {
    request_animation_frame(|| {
        if let Some(title) = web_sys::window()
            .and_then(|window| window.document())
            .and_then(|document| document.get_element_by_id("architecture-title"))
            .and_then(|element| element.dyn_into::<web_sys::HtmlElement>().ok())
        {
            let _result = title.focus();
        }
    });
}
