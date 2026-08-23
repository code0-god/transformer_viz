//! Shared rectangular Root Architecture node projection.

use leptos::prelude::*;

use crate::app::architecture_overview::ArchitectureNodeId;

use super::super::super::node::{ArchitectureInteraction, NodeBounds, architecture_node};

#[derive(Clone, Copy)]
pub(super) struct NodeSpec {
    pub id: ArchitectureNodeId,
    pub class: &'static str,
    pub x: usize,
    pub y: usize,
    pub width: usize,
    pub height: usize,
    pub title: &'static str,
    pub subtitle: &'static str,
}

pub(super) fn stage_node(spec: NodeSpec, interaction: ArchitectureInteraction) -> impl IntoView {
    let center_x = spec.x + spec.width / 2;
    let single_line = spec.subtitle.is_empty();
    let title_y = if single_line {
        spec.y + spec.height / 2 + 2
    } else {
        spec.y + if spec.height > 42 { 22 } else { 17 }
    };
    let subtitle_y = spec.y + if spec.height > 42 { 41 } else { 32 };
    architecture_node(
        spec.id,
        spec.title,
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
                    {spec.title}
                </text>
                <text
                    class="architecture-node-subtitle"
                    x=center_x
                    y=subtitle_y
                    text-anchor="middle"
                >
                    {spec.subtitle}
                </text>
            </g>
        },
    )
}
