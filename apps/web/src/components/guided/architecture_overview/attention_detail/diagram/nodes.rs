//! Shared visual nodes for Self-Attention Architecture.

use leptos::prelude::*;

use crate::app::architecture_overview::ArchitectureNodeId;

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
    title: &'static str,
    subtitle: String,
    interaction: ArchitectureInteraction,
) -> impl IntoView {
    let center_x = x + width / 2;
    view! {
        {architecture_node(
            id,
            title,
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
            },
        )}
    }
}

pub(super) fn split_heads_node(
    x: usize,
    y: usize,
    title: &'static str,
    head_count: usize,
    head_dimension: usize,
) -> impl IntoView {
    let center_x = x + COLUMN_WIDTH / 2;
    view! {
        <g class="architecture-attention-split">
            <rect x=x y=y width=COLUMN_WIDTH height=COLUMN_HEIGHT rx="10"></rect>
            <text x=center_x y=y + 28 text-anchor="middle">{title}</text>
            <text
                class="architecture-node-subtitle"
                x=center_x
                y=y + 50
                text-anchor="middle"
            >
                {format!("[H, T, D] = [{head_count}, T, {head_dimension}]")}
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
    subtitle: String,
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
