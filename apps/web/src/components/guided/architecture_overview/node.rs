//! Shared SVG interaction contract for architecture nodes.

use leptos::prelude::*;

use crate::app::{
    architecture_overview::{ArchitectureNodeCapability, ArchitectureNodeId},
    state::AppState,
};

use super::focus_architecture_title;

/// Geometry used by the common focus and pointer hit target.
#[derive(Clone, Copy)]
pub(super) struct NodeBounds {
    pub x: usize,
    pub y: usize,
    pub width: usize,
    pub height: usize,
    pub radius: usize,
}

/// Position of the drill-down affordance inside a node.
#[derive(Clone, Copy)]
pub(super) struct DrillDownIndicator {
    pub x: usize,
    pub y: usize,
    pub label: &'static str,
}

/// State-only activation channel shared by every architecture node.
#[derive(Clone, Copy)]
pub(super) struct ArchitectureInteraction {
    state: RwSignal<AppState>,
    layer_count: usize,
    head_count: usize,
    selected: Option<ArchitectureNodeId>,
}

impl ArchitectureInteraction {
    pub(in crate::components::guided::architecture_overview) const fn new(
        state: RwSignal<AppState>,
        layer_count: usize,
        head_count: usize,
        selected: Option<ArchitectureNodeId>,
    ) -> Self {
        Self {
            state,
            layer_count,
            head_count,
            selected,
        }
    }

    fn is_selected(self, node: ArchitectureNodeId) -> bool {
        self.selected == Some(node)
    }

    fn activate(self, node: ArchitectureNodeId) {
        let opens_detail = node.can_open();
        self.state.update(|current| {
            current
                .ui
                .architecture_overview
                .activate_node(node, self.layer_count, self.head_count);
        });
        if opens_detail {
            focus_architecture_title();
        }
    }
}

pub(super) fn architecture_node(
    id: ArchitectureNodeId,
    label: &'static str,
    bounds: NodeBounds,
    interaction: ArchitectureInteraction,
    indicator: Option<DrillDownIndicator>,
    children: impl IntoView,
) -> impl IntoView {
    let capability = id.capability();
    let interactive = capability.is_interactive();
    let selected = interaction.is_selected(id);
    let accessible_name = match capability {
        ArchitectureNodeCapability::Static => label.to_owned(),
        ArchitectureNodeCapability::Selectable => format!("{label}, 선택 가능"),
        ArchitectureNodeCapability::DrillDown => format!("{label}, 자세히 보기 가능"),
    };
    let click_interaction = interaction;
    let key_interaction = interaction;

    view! {
        <g
            class=format!(
                "architecture-interactive-node architecture-interactive-node--{}{}",
                capability.as_str(),
                if selected { " is-selected" } else { "" },
            )
            data-node-id=id.as_str()
            data-node-capability=capability.as_str()
            data-selected=selected.then_some("true")
            role=interactive.then_some("button")
            tabindex=interactive.then_some("0")
            aria-label=accessible_name
            aria-pressed=interactive.then_some(if selected { "true" } else { "false" })
            on:click=move |_| {
                if interactive {
                    click_interaction.activate(id);
                }
            }
            on:keydown=move |event| {
                if interactive && matches!(event.key().as_str(), "Enter" | " ") {
                    event.prevent_default();
                    key_interaction.activate(id);
                }
            }
        >
            {children}
            <rect
                class="architecture-node-focus-outline"
                x=bounds.x
                y=bounds.y
                width=bounds.width
                height=bounds.height
                rx=bounds.radius
                aria-hidden="true"
            ></rect>
            {indicator.map(|position| view! {
                <text
                    class="architecture-node-drilldown-indicator"
                    x=position.x
                    y=position.y
                    text-anchor="end"
                    aria-hidden="true"
                >
                    {position.label}
                </text>
            })}
        </g>
    }
}
