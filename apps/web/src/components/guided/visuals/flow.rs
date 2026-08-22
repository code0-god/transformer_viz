//! Labelled geometric tensor-flow diagrams with equivalent HTML summaries.

use leptos::prelude::*;

#[derive(Debug, Clone)]
pub(super) struct FlowNode {
    pub label: &'static str,
    pub tensor_id: String,
    pub shape: Vec<usize>,
    pub tone: &'static str,
}

#[must_use]
pub(super) fn flow_diagram(
    title: &'static str,
    description: &'static str,
    nodes: Vec<FlowNode>,
) -> impl IntoView {
    let width = 760.0_f32;
    let count = nodes.len().max(1);
    let count_f32 = u16::try_from(count).map_or_else(|_| f32::from(u16::MAX), f32::from);
    let step = width / count_f32;
    let svg_nodes = nodes.clone();
    view! {
        <figure class="flow-diagram">
            <svg role="img" viewBox="0 0 760 150">
                <title>{title}</title><desc>{description}</desc>
                {svg_nodes.iter().enumerate().skip(1).map(|(index, _)| {
                    let index_f32 = u16::try_from(index).map_or_else(|_| f32::from(u16::MAX), f32::from);
                    let start = (index_f32 - 1.0).mul_add(step, step * 0.76);
                    let end = index_f32.mul_add(step, step * 0.12);
                    view! { <path class="flow-path" d=format!("M{start} 75 H{end}") /> }
                }).collect_view()}
                {svg_nodes.into_iter().enumerate().map(|(index, node)| {
                    let index_f32 = u16::try_from(index).map_or_else(|_| f32::from(u16::MAX), f32::from);
                    let x = index_f32.mul_add(step, step * 0.12);
                    let node_width = step * 0.64;
                    view! { <g class=format!("flow-group flow-{}", node.tone) data-tensor-id=node.tensor_id><rect x=x y="34" width=node_width height="82" rx="10" /><text x=x + node_width / 2.0 y="68">{node.label}</text><text class="flow-shape" x=x + node_width / 2.0 y="94">{format!("{:?}", node.shape)}</text></g> }
                }).collect_view()}
            </svg>
            <ol class="flow-summary" aria-label=format!("{title} HTML 요약")>{nodes.into_iter().map(|node| view! { <li data-tensor-id=node.tensor_id><strong>{node.label}</strong><code>{format!("{:?}", node.shape)}</code></li> }).collect_view()}</ol>
        </figure>
    }
}
