//! Causal attention heatmap and selected-cell mathematics.

use leptos::prelude::*;
use wasm_bindgen::JsCast as _;

use crate::{
    app::{state::AppState, worker_client::WorkerClient},
    components::chrome::send_or_error,
    visualization::{GridDirection, format_precise, move_grid, probability_lightness},
};

/// Real attention probability matrix with synchronized cell inspection.
#[must_use]
pub fn attention_view(state: RwSignal<AppState>, client: WorkerClient) -> impl IntoView {
    view! {
        <section class="panel attention-panel" aria-labelledby="attention-title">
            <div class="panel-heading"><div><h2 id="attention-title">"Causal self-attention"</h2><p>"행은 query, 열은 key입니다. 방향키로 셀을 이동할 수 있습니다."</p></div><span class="coordinate">{move || format!("L{} / H{}", state.get().selection.layer, state.get().selection.head)}</span></div>
            {move || state.get().attention.map_or_else(
                || view! { <p class="empty">"헤드를 선택하면 Q, K, V와 실제 softmax 확률을 불러옵니다."</p> }.into_any(),
                |trace| {
                    let token_count = trace.mask.rows;
                    let head = state.get().selection.head;
                    let cells = (0..token_count).flat_map(|query| (0..token_count).map(move |key| (query, key))).collect::<Vec<_>>();
                    let svg_trace = trace.clone();
                    let button_trace = trace.clone();
                    view! {
                        <div class="heatmap-wrap">
                            <div class="axis-label columns">"key 위치 →"</div>
                            <div class="heatmap-with-axis"><span class="axis-label rows">"query 위치 →"</span><div class="heatmap-frame" style=format!("--cells: {token_count}")>
                                <svg class="heatmap-svg" viewBox=format!("0 0 {token_count} {token_count}") role="img" aria-labelledby="heatmap-svg-title heatmap-svg-desc">
                                    <title id="heatmap-svg-title">{format!("레이어 {} 헤드 {} 어텐션 확률", trace.layer, trace.head)}</title>
                                    <desc id="heatmap-svg-desc">"각 행은 query 토큰, 각 열은 key 토큰입니다. 대각선 오른쪽은 미래 토큰이라 마스킹됩니다."</desc>
                                    <defs><pattern id="future-hatch" width="0.3" height="0.3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="0.3" class="hatch-line" /></pattern></defs>
                                    {cells.iter().map(|(query, key)| {
                                        let probability = score(&svg_trace.probabilities, *query, *key);
                                        let allowed = svg_trace.mask.allowed[query * token_count + key];
                                        view! { <rect x=*key y=*query width="1" height="1" class:future=!allowed style=if allowed { format!("fill: hsl(13 58% {}%)", probability_lightness(probability)) } else { "fill: url(#future-hatch)".to_owned() } /> }
                                    }).collect_view()}
                                </svg>
                                <div class="heatmap-grid" role="grid" aria-rowcount=token_count aria-colcount=token_count>
                                    {cells.into_iter().map(|(query, key)| {
                                        let click_client = client.clone();
                                        let key_client = client.clone();
                                        let allowed = button_trace.mask.allowed[query * token_count + key];
                                        let probability = score(&button_trace.probabilities, query, key);
                                        view! { <button
                                            id=format!("attention-cell-{query}-{key}")
                                            type="button"
                                            role="gridcell"
                                            class="heatmap-cell"
                                            class:future=!allowed
                                            class:selected=move || state.get().selection.token == query && state.get().selection.key == key
                                            tabindex=move || if state.get().selection.token == query && state.get().selection.key == key { "0" } else { "-1" }
                                            aria-label=format!("query {query}, key {key}, head {head}, {}, 확률 {:.8}", if allowed { "허용" } else { "미래 마스크" }, probability)
                                            on:click=move |_| select_cell(state, &click_client, query, key)
                                            on:keydown=move |event| {
                                                let direction = match event.key().as_str() { "ArrowLeft" => Some(GridDirection::Left), "ArrowRight" => Some(GridDirection::Right), "ArrowUp" => Some(GridDirection::Up), "ArrowDown" => Some(GridDirection::Down), _ => None };
                                                if let Some(direction) = direction {
                                                    event.prevent_default();
                                                    let (next_query, next_key) = move_grid(query, key, token_count, token_count, direction);
                                                    select_cell(state, &key_client, next_query, next_key);
                                                    focus_cell(next_query, next_key);
                                                }
                                            }
                                        ><span class="sr-only">{format!("{probability:.8}")}</span></button> }
                                    }).collect_view()}
                                </div>
                            </div></div>
                            <div class="legend" aria-label="확률 색상 범례"><span>"0.0"</span><span class="legend-ramp"></span><span>"1.0"</span><span class="legend-mask">"/// 미래 마스크"</span></div>
                        </div>
                        {cell_detail(state, &trace)}
                    }.into_any()
                }
            )}
        </section>
    }
}

fn cell_detail(
    state: RwSignal<AppState>,
    trace: &nanogpt_schema::AttentionHeadTrace,
) -> impl IntoView + use<> {
    let selection = state.get().selection;
    let tokens = trace.mask.rows;
    let head = selection.head;
    let query = selection.token.min(tokens.saturating_sub(1));
    let key = selection.key.min(tokens.saturating_sub(1));
    let head_size = trace.query.shape.last().copied().unwrap_or(1);
    let raw = score(&trace.raw_scores, query, key);
    let scaled = score(&trace.scaled_scores, query, key);
    let probability = score(&trace.probabilities, query, key);
    let allowed = trace.mask.allowed[query * tokens + key];
    view! {
        <article class="cell-detail" aria-live="polite"><h3>{format!("선택 셀 q{query} × k{key}")}</h3>
            <dl class="detail-grid">
                <div><dt>"head"</dt><dd>{head}</dd></div><div><dt>"D"</dt><dd>{head_size}</dd></div><div><dt>"√D scale"</dt><dd>{format!("1 / {:.6}", head_scale(head_size))}</dd></div>
                <div><dt>"Q"</dt><dd>{vector_preview(&trace.query, query, head_size)}</dd></div><div><dt>"K"</dt><dd>{vector_preview(&trace.key, key, head_size)}</dd></div>
                <div><dt>"Q·K"</dt><dd>{format_precise(raw)}</dd></div><div><dt>"scaled score"</dt><dd>{format_precise(scaled)}</dd></div><div><dt>"mask"</dt><dd>{if allowed { "허용" } else { "미래 차단" }}</dd></div><div><dt>"probability"</dt><dd>{format_precise(probability)}</dd></div>
            </dl>
        </article>
    }
}

fn select_cell(state: RwSignal<AppState>, client: &WorkerClient, query: usize, key: usize) {
    let mut request = None;
    state.update(|current| request = current.select_cell(query, key));
    if let Some(request) = request {
        send_or_error(state, client, &request);
    }
}

fn focus_cell(query: usize, key: usize) {
    let id = format!("attention-cell-{query}-{key}");
    if let Some(element) = web_sys::window()
        .and_then(|window| window.document())
        .and_then(|document| document.get_element_by_id(&id))
        .and_then(|element| element.dyn_into::<web_sys::HtmlElement>().ok())
    {
        let _result = element.focus();
    }
}

fn head_scale(head_size: usize) -> f32 {
    u16::try_from(head_size).map_or(f32::INFINITY, |value| f32::from(value).sqrt())
}

fn score(snapshot: &nanogpt_schema::TensorSnapshot, query: usize, key: usize) -> f32 {
    let columns = snapshot.shape.last().copied().unwrap_or(1);
    let index = query.saturating_mul(columns).saturating_add(key);
    snapshot.values.get(index).map_or(0.0, |value| value.get())
}

fn vector_preview(snapshot: &nanogpt_schema::TensorSnapshot, token: usize, width: usize) -> String {
    let start = token.saturating_mul(width);
    let end = start
        .saturating_add(width.min(4))
        .min(snapshot.values.len());
    snapshot.values.get(start..end).map_or_else(
        || "[]".to_owned(),
        |values| {
            format!(
                "[{} …]",
                values
                    .iter()
                    .map(|value| format!("{:.5}", value.get()))
                    .collect::<Vec<_>>()
                    .join(", ")
            )
        },
    )
}
