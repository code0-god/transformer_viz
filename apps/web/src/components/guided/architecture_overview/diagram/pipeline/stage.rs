//! Shared rectangular Root Architecture node projection.

use leptos::prelude::*;

use crate::app::{architecture_overview::ArchitectureNodeId, notation::notation_for};

use super::super::super::node::{ArchitectureInteraction, NodeBounds, architecture_node};

#[derive(Clone, Copy)]
pub(super) struct NodeSpec {
    pub id: ArchitectureNodeId,
    pub class: &'static str,
    pub x: usize,
    pub y: usize,
    pub width: usize,
    pub height: usize,
}

pub(super) fn stage_node(spec: NodeSpec, interaction: ArchitectureInteraction) -> AnyView {
    let Some(notation) = notation_for(spec.id) else {
        return ().into_any();
    };
    let center_x = spec.x + spec.width / 2;
    let single_line = notation.diagram_detail.is_empty();
    let title_y = if single_line {
        spec.y + spec.height / 2 + 2
    } else {
        spec.y + if spec.height > 42 { 22 } else { 17 }
    };
    let subtitle_y = spec.y + if spec.height > 42 { 41 } else { 32 };
    architecture_node(
        spec.id,
        notation.accessible_name,
        NodeBounds {
            x: spec.x,
            y: spec.y,
            width: spec.width,
            height: spec.height,
            radius: 9,
        },
        interaction,
        None,
        view! {
            <g class=format!("architecture-node {}", spec.class)>
                <rect
                    x=spec.x
                    y=spec.y
                    width=spec.width
                    height=spec.height
                    rx="9"
                ></rect>
                <text
                    x=center_x
                    y=title_y
                    text-anchor="middle"
                    dominant-baseline=if single_line { "middle" } else { "auto" }
                >
                    {notation.title}
                </text>
                <text
                    class="architecture-node-subtitle"
                    x=center_x
                    y=subtitle_y
                    text-anchor="middle"
                >
                    {notation.diagram_detail}
                </text>
            </g>
        },
    )
    .into_any()
}
