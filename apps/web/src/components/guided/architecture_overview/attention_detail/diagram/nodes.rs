//! Shared visual nodes for Self-Attention Architecture.

use leptos::prelude::*;

use crate::app::{
    architecture_overview::ArchitectureNodeId,
    notation::{SPLIT_HEADS_DETAIL, SPLIT_HEADS_TITLE, notation_for},
};

use super::super::super::node::{ArchitectureInteraction, NodeBounds, architecture_node};
use super::{COLUMN_HEIGHT, COLUMN_WIDTH};

#[allow(clippy::too_many_arguments)]
pub(super) fn operation_node(
    id: ArchitectureNodeId,
    class: &'static str,
    x: usize,
    y: usize,
    width: usize,
    height: usize,
    interaction: ArchitectureInteraction,
) -> AnyView {
    let Some(notation) = notation_for(id) else {
        return ().into_any();
    };
    let center_x = x + width / 2;
    view! {
        {architecture_node(
            id,
            notation.accessible_name,
            NodeBounds {
                x,
                y,
                width,
                height,
                radius: 10,
            },
            interaction,
            None,
            view! {
                <g class=format!("architecture-attention-operation {class}")>
                    <rect x=x y=y width=width height=height rx="10"></rect>
                    <text x=center_x y=y + height / 2 - 3 text-anchor="middle">
                        {notation.title}
                    </text>
                    <text
                        class="architecture-node-subtitle"
                        x=center_x
                        y=y + height / 2 + 18
                        text-anchor="middle"
                    >
                        {notation.diagram_detail}
                    </text>
                </g>
            },
        )}
    }
    .into_any()
}

pub(super) fn split_heads_node(x: usize, y: usize) -> impl IntoView {
    let center_x = x + COLUMN_WIDTH / 2;
    view! {
        <g class="architecture-attention-split">
            <rect x=x y=y width=COLUMN_WIDTH height=COLUMN_HEIGHT rx="10"></rect>
            <text x=center_x y=y + 28 text-anchor="middle">{SPLIT_HEADS_TITLE}</text>
            <text
                class="architecture-node-subtitle"
                x=center_x
                y=y + 50
                text-anchor="middle"
            >
                {SPLIT_HEADS_DETAIL}
            </text>
        </g>
    }
}

pub(super) fn state_node(
    x: usize,
    y: usize,
    width: usize,
    height: usize,
    title: &'static str,
    subtitle: &'static str,
) -> impl IntoView {
    let center_x = x + width / 2;
    view! {
        <g class="architecture-attention-state">
            <rect x=x y=y width=width height=height rx="10"></rect>
            <text x=center_x y=y + height / 2 - 3 text-anchor="middle">{title}</text>
            <text
                class="architecture-node-subtitle"
                x=center_x
                y=y + height / 2 + 18
                text-anchor="middle"
            >
                {subtitle}
            </text>
        </g>
    }
}
