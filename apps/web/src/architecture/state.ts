import { type ArchitectureNodeId, architectureNodeCatalog } from "./catalog";

export type ArchitectureView = "root" | "transformer-block" | "self-attention";

export interface ArchitectureState {
  readonly view: ArchitectureView;
  readonly selectedLayer: number;
  readonly selectedHead: number;
  readonly selectedNodeId: ArchitectureNodeId | null;
}

export type ArchitectureAction =
  | {
      readonly type: "activate-node";
      readonly nodeId: ArchitectureNodeId;
      readonly layerCount: number;
      readonly headCount: number;
    }
  | {
      readonly type: "navigate-breadcrumb";
      readonly view: ArchitectureView;
      readonly layerCount: number;
    }
  | {
      readonly type: "select-layer";
      readonly layer: number;
      readonly layerCount: number;
    }
  | {
      readonly type: "select-head";
      readonly head: number;
      readonly headCount: number;
    };

export const initialArchitectureState: ArchitectureState = {
  view: "root",
  selectedLayer: 0,
  selectedHead: 0,
  selectedNodeId: null,
};

function clampIndex(requested: number, count: number): number | null {
  if (count <= 0) return null;
  return Math.max(0, Math.min(Math.trunc(requested), count - 1));
}

function openBlock(
  state: ArchitectureState,
  layerCount: number,
): ArchitectureState {
  const selectedLayer = clampIndex(state.selectedLayer, layerCount);
  if (selectedLayer === null) return initialArchitectureState;
  return {
    ...state,
    view: "transformer-block",
    selectedLayer,
    selectedNodeId: "transformer-block",
  };
}

function openAttention(
  state: ArchitectureState,
  layerCount: number,
  headCount: number,
): ArchitectureState {
  const selectedLayer = clampIndex(state.selectedLayer, layerCount);
  const selectedHead = clampIndex(state.selectedHead, headCount);
  if (selectedLayer === null || selectedHead === null)
    return initialArchitectureState;
  return {
    ...state,
    view: "self-attention",
    selectedLayer,
    selectedHead,
    selectedNodeId: "self-attention",
  };
}

function activateNode(
  state: ArchitectureState,
  action: Extract<ArchitectureAction, { type: "activate-node" }>,
): ArchitectureState {
  if (action.nodeId === "transformer-block")
    return openBlock(state, action.layerCount);
  if (action.nodeId === "self-attention")
    return openAttention(state, action.layerCount, action.headCount);
  if (architectureNodeCatalog[action.nodeId].capability === "selectable") {
    return { ...state, selectedNodeId: action.nodeId };
  }
  return state;
}

function navigateBreadcrumb(
  state: ArchitectureState,
  action: Extract<ArchitectureAction, { type: "navigate-breadcrumb" }>,
): ArchitectureState {
  switch (action.view) {
    case "root":
      return { ...state, view: "root", selectedNodeId: null };
    case "transformer-block": {
      const selectedLayer = clampIndex(state.selectedLayer, action.layerCount);
      if (selectedLayer === null) return initialArchitectureState;
      return {
        ...state,
        view: "transformer-block",
        selectedLayer,
        selectedNodeId: "self-attention",
      };
    }
    case "self-attention":
      return state;
  }
}

export function architectureReducer(
  state: ArchitectureState,
  action: ArchitectureAction,
): ArchitectureState {
  switch (action.type) {
    case "activate-node":
      return activateNode(state, action);
    case "navigate-breadcrumb":
      return navigateBreadcrumb(state, action);
    case "select-layer": {
      const selectedLayer = clampIndex(action.layer, action.layerCount);
      return selectedLayer === null ? state : { ...state, selectedLayer };
    }
    case "select-head": {
      const selectedHead = clampIndex(action.head, action.headCount);
      return selectedHead === null ? state : { ...state, selectedHead };
    }
  }
}

export function architectureBreadcrumbs(
  view: ArchitectureView,
  layerCount: number,
): readonly string[] {
  const block = `Transformer Block × ${layerCount}`;
  switch (view) {
    case "root":
      return ["GPT"];
    case "transformer-block":
      return ["GPT", block];
    case "self-attention":
      return ["GPT", block, "Self-Attention"];
  }
}
