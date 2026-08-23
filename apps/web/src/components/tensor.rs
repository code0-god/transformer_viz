//! Tensor identity, statistics, slices, and selected values.

use leptos::prelude::*;

use crate::{app::state::AppState, components::block::stats_view, visualization::format_precise};

/// Selected token tensor inspector.
#[must_use]
pub fn tensor_view(state: RwSignal<AppState>) -> impl IntoView {
    view! {
        <section class="panel tensor-panel" aria-labelledby="tensor-title">
            <div class="panel-heading"><div><h2 id="tensor-title">"Tensor 검사"</h2><p>"이름, shape, f32 통계와 row-major slice를 함께 확인합니다."</p></div></div>
            {move || state.get().token.map_or_else(
                || view! { <p class="empty">"토큰을 선택하면 실제 텐서 값이 표시됩니다."</p> }.into_any(),
                |trace| tensor_snapshot_view(trace.input, trace.token).into_any()
            )}
        </section>
    }
}

/// Reusable bounded tensor renderer.
#[must_use]
pub fn tensor_snapshot_view(
    snapshot: nanogpt_schema::TensorSnapshot,
    selected_token: usize,
) -> impl IntoView {
    let nanogpt_schema::TensorSnapshot {
        id: _,
        label: tensor_label,
        shape,
        values,
        stats,
    } = snapshot;
    let rank = shape.len();
    let width = shape.last().copied().unwrap_or(1);
    let row_count = values.len().div_ceil(width);
    let selected_index = 0;
    let selected = values.get(selected_index).map_or(0.0, |value| value.get());
    let label = match rank {
        0 => "scalar",
        1 => "vector",
        2 => "matrix",
        _ => "higher-rank slice",
    };
    let rows = row_count.min(8);
    let columns = width.min(8);
    view! {
        <div class="tensor-identity"><div><span>"tensor"</span><strong>{tensor_label}</strong></div><div><span>"shape"</span><strong>{format!("{shape:?}")}</strong></div><div><span>"dtype"</span><strong>"f32"</strong></div><div><span>"view"</span><strong>{label}</strong></div></div>
        {stats_view(&stats)}
        <p class="selected-value"><span>"선택 값"</span><strong>{format_precise(selected)}</strong><small>{format!("token {selected_token}, local flat index {selected_index}")}</small></p>
        <div class="tensor-table-wrap" tabindex="0" aria-label="텐서 slice 표, 가로 스크롤 가능">
    <table class="tensor-table"><caption>{format!("앞쪽 {rows}행 {columns}열 slice")}</caption><thead><tr><th scope="col">"row"</th>{(0..columns).map(|column| view! { <th scope="col">{column}</th> }).collect_view()}</tr></thead>
                <tbody>{(0..rows).map(|row| view! { <tr><th scope="row">{row}</th>{(0..columns).map(|column| {
                    let index = row * width + column;
                    let value = values.get(index).map_or(0.0, |value| value.get());
                    view! { <td class:selected=index == selected_index>{format!("{value:.5}")}</td> }
                }).collect_view()}</tr> }).collect_view()}</tbody>
            </table>
        </div>
    }
}
