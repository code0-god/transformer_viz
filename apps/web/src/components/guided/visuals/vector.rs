//! Accessible signed vector strips with one shared comparison scale.

use leptos::prelude::*;

#[derive(Debug, Clone)]
pub(super) struct VectorStrip {
    pub label: &'static str,
    pub tensor_id: String,
    pub values: Vec<f32>,
    pub tone: &'static str,
    pub selected_feature: usize,
}

#[must_use]
pub(super) fn shared_scale(strips: &[VectorStrip]) -> f32 {
    strips
        .iter()
        .flat_map(|strip| strip.values.iter())
        .map(|value| value.abs())
        .fold(f32::EPSILON, f32::max)
}

#[must_use]
pub(super) fn vector_strip(strip: VectorStrip, scale: f32) -> impl IntoView {
    let count = strip.values.len();
    let width = 720.0_f32;
    let count_f32 = u16::try_from(count.max(1)).map_or_else(|_| f32::from(u16::MAX), f32::from);
    let slot = width / count_f32;
    let bars = strip.values.clone();
    let html_values = strip.values.clone();
    let label = strip.label;
    let title = format!("{label} 전체 {count}차원 signed vector");
    let aria_title = title.clone();
    let description = format!(
        "0선을 기준으로 양수는 위, 음수는 아래입니다. 모든 비교 vector는 공통 절대값 scale {scale:.6}을 사용합니다."
    );
    view! {
        <figure class=format!("vector-strip vector-{}", strip.tone) data-tensor-id=strip.tensor_id>
            <figcaption><strong>{label}</strong><span>{format!("D={count} · shared |max| {scale:.5}")}</span></figcaption>
            <svg role="img" viewBox="0 0 720 144" aria-label=aria_title>
                <title>{title}</title><desc>{description}</desc>
                <line class="vector-zero" x1="0" y1="72" x2="720" y2="72" />
                {bars.into_iter().enumerate().map(|(index, value)| {
                    let magnitude = (value.abs() / scale) * 58.0;
                    let y = if value >= 0.0 { 72.0 - magnitude } else { 72.0 };
                    let index_f32 = u16::try_from(index).map_or_else(|_| f32::from(u16::MAX), f32::from);
                    let x = index_f32.mul_add(slot, slot * 0.16);
                    view! { <rect class="vector-bar" class:selected=index == strip.selected_feature x=x y=y width=(slot * 0.68).max(1.0) height=magnitude.max(0.6)><title>{format!("feature {index}: {value:.7}")}</title></rect> }
                }).collect_view()}
            </svg>
            <ol class="vector-values" aria-label=format!("{label} 전체 HTML 값")>
                {html_values.into_iter().enumerate().map(|(index, value)| view! { <li class:selected=index == strip.selected_feature><span>{index}</span><code>{format!("{value:+.6}")}</code></li> }).collect_view()}
            </ol>
        </figure>
    }
}
