//! Accessible attention matrix heatmap with roving keyboard cell focus.

use leptos::prelude::*;
use wasm_bindgen::JsCast as _;

use crate::app::{state::AppState, worker_client::WorkerClient};

use super::super::shell::send_or_error;

#[derive(Debug, Clone, Copy)]
pub(super) enum MatrixMode {
    Raw,
    Scaled,
    Mask,
    Probability,
}

impl MatrixMode {
    const fn name(self) -> &'static str {
        match self {
            Self::Raw => "raw",
            Self::Scaled => "scaled",
            Self::Mask => "mask",
            Self::Probability => "probability",
        }
    }
    const fn label(self) -> &'static str {
        match self {
            Self::Raw => "원시 점수",
            Self::Scaled => "scaled 점수",
            Self::Mask => "causal mask",
            Self::Probability => "softmax 확률",
        }
    }
}

#[derive(Debug, Clone)]
pub(super) struct MatrixSpec {
    pub tensor_id: String,
    pub rows: usize,
    pub cols: usize,
    pub values: Vec<f32>,
    pub allowed: Vec<bool>,
    pub mode: MatrixMode,
    pub query: usize,
    pub key: usize,
    pub interactive: bool,
    pub head: usize,
}

#[must_use]
pub(super) fn matrix_heatmap(
    spec: MatrixSpec,
    state: RwSignal<AppState>,
    client: &WorkerClient,
) -> impl IntoView {
    let cells = (0..spec.rows)
        .flat_map(|query| (0..spec.cols).map(move |key| (query, key)))
        .collect::<Vec<_>>();
    let svg_cells = cells.clone();
    let svg_spec = spec.clone();
    let button_spec = spec.clone();
    let mode = spec.mode.name();
    let label = spec.mode.label();
    let grid_style = format!("--matrix-rows: {}; --matrix-cols: {}", spec.rows, spec.cols);
    let value_limit = spec
        .values
        .iter()
        .map(|value| value.abs())
        .fold(f32::EPSILON, f32::max);
    view! {
        <figure class="attention-matrix" data-mode=mode data-tensor-id=spec.tensor_id>
            <figcaption><strong>{label}</strong><span>"행 query · 열 key"</span></figcaption>
            <div class="matrix-scroll" tabindex="0" aria-label=format!("{label} matrix, 가로 스크롤 가능")>
                <div class="matrix-frame" style=grid_style>
                    <svg role="img" viewBox=format!("0 0 {} {}", spec.cols, spec.rows)>
                        <title>{format!("선택 헤드 H{} {label} 전체 matrix", spec.head)}</title>
                        <desc>"행은 query 토큰, 열은 key 토큰입니다. 선택 셀은 굵은 테두리이며 미래 셀은 대각선 hatch와 마스크 텍스트로 구분됩니다."</desc>
                        <defs><pattern id=format!("mask-hatch-{mode}") width="0.28" height="0.28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="0.28" class="matrix-hatch" /></pattern></defs>
                        {svg_cells.into_iter().map(|(query, key)| {
                            let index = query.saturating_mul(svg_spec.cols).saturating_add(key);
                            let value = svg_spec.values.get(index).copied().unwrap_or_default();
                            let allowed = svg_spec.allowed.get(index).copied().unwrap_or(true);
                            let opacity = if matches!(svg_spec.mode, MatrixMode::Probability) { value.clamp(0.04, 1.0) } else { (value.abs() / value_limit).clamp(0.08, 1.0) };
                            let fill = if allowed || !matches!(svg_spec.mode, MatrixMode::Mask) { format!("color-mix(in srgb, var(--matrix-ramp-end) {}%, var(--matrix-ramp-start))", opacity * 100.0) } else { format!("url(#mask-hatch-{mode})") };
                            view! { <rect x=key y=query width="1" height="1" style=format!("fill: {fill}") class:selected=query == svg_spec.query && key == svg_spec.key><title>{format!("q{query}, k{key}: {value:.7}, {}", if allowed { "허용" } else { "미래 차단" })}</title></rect> }
                        }).collect_view()}
                    </svg>
                    <div class="matrix-grid" role="grid" aria-rowcount=spec.rows aria-colcount=spec.cols>
                        {cells.into_iter().map(|(query, key)| {
                            let click_client = (*client).clone();
                            let key_client = (*client).clone();
                            let index = query.saturating_mul(button_spec.cols).saturating_add(key);
                            let value = button_spec.values.get(index).copied().unwrap_or_default();
                            let allowed = button_spec.allowed.get(index).copied().unwrap_or(true);
                            let cell_id = format!("stage-{mode}-cell-{query}-{key}");
                            let keyboard_id = cell_id.clone();
                            let interactive = button_spec.interactive;
                            let rows = button_spec.rows;
                            let cols = button_spec.cols;
                            view! { <button id=cell_id type="button" role="gridcell" data-masked=(!allowed).then_some("true") class:selected=query == button_spec.query && key == button_spec.key tabindex=if query == button_spec.query && key == button_spec.key { "0" } else { "-1" } aria-label=format!("query {query}, key {key}, head {}, {}, {label} {value:.8}", button_spec.head, if allowed { "허용" } else { "미래 마스크" }) on:click=move |_| { if interactive { select_cell(state, &click_client, query, key); } } on:keydown=move |event| {
                                let next = match event.key().as_str() { "ArrowLeft" => Some((query, key.saturating_sub(1))), "ArrowRight" => Some((query, (key + 1).min(cols.saturating_sub(1)))), "ArrowUp" => Some((query.saturating_sub(1), key)), "ArrowDown" => Some(((query + 1).min(rows.saturating_sub(1)), key)), _ => None };
                                if let Some((next_query, next_key)) = next { event.prevent_default(); if interactive { select_cell(state, &key_client, next_query, next_key); } focus_cell(mode, next_query, next_key); }
                            }><span>{if !allowed && matches!(button_spec.mode, MatrixMode::Mask) { "mask".to_owned() } else { format!("{value:.3}") }}</span><span class="sr-only">{keyboard_id}</span></button> }
                        }).collect_view()}
                    </div>
                </div>
            </div>
            <div class="matrix-legend"><span>"낮음"</span><span class="matrix-ramp"></span><span>"높음"</span><span class="mask-key">"/// 미래 차단"</span></div>
        </figure>
    }
}

fn select_cell(state: RwSignal<AppState>, client: &WorkerClient, query: usize, key: usize) {
    let mut request = None;
    state.update(|current| request = current.select_cell(query, key));
    if let Some(request) = request {
        send_or_error(state, client, &request);
    }
}

fn focus_cell(mode: &str, query: usize, key: usize) {
    let id = format!("stage-{mode}-cell-{query}-{key}");
    if let Some(element) = web_sys::window()
        .and_then(|window| window.document())
        .and_then(|document| document.get_element_by_id(&id))
        .and_then(|element| element.dyn_into::<web_sys::HtmlElement>().ok())
    {
        let _result = element.focus();
    }
}
