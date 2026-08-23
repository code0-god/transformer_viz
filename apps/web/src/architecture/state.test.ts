import {
  type ArchitectureAction,
  type ArchitectureState,
  architectureReducer,
  initialArchitectureState,
} from "./state";

describe("architecture navigation", () => {
  test("starts at the GPT root without a selected node", () => {
    expect(initialArchitectureState).toEqual({
      view: "root",
      selectedLayer: 0,
      selectedHead: 0,
      selectedNodeId: null,
    });
  });

  test("navigates Root to Block to Self-Attention with a pure reducer", () => {
    const block = architectureReducer(initialArchitectureState, {
      type: "activate-node",
      nodeId: "transformer-block",
      layerCount: 4,
      headCount: 8,
    });
    const attention = architectureReducer(block, {
      type: "activate-node",
      nodeId: "self-attention",
      layerCount: 4,
      headCount: 8,
    });

    expect(block.view).toBe("transformer-block");
    expect(attention.view).toBe("self-attention");
    expect(attention.selectedNodeId).toBeNull();
  });

  test("breadcrumb navigation returns while preserving layer and head", () => {
    const state: ArchitectureState = {
      ...initialArchitectureState,
      view: "self-attention",
      selectedLayer: 2,
      selectedHead: 3,
      selectedNodeId: "attention-softmax",
    };
    const block = architectureReducer(state, {
      type: "navigate-breadcrumb",
      view: "transformer-block",
      layerCount: 4,
    });
    const root = architectureReducer(block, {
      type: "navigate-breadcrumb",
      view: "root",
      layerCount: 4,
    });

    expect(block).toMatchObject({ selectedLayer: 2, selectedHead: 3 });
    expect(root).toMatchObject({
      view: "root",
      selectedLayer: 2,
      selectedHead: 3,
      selectedNodeId: "attention-softmax",
    });
  });

  test("pure navigation has no Worker command output", () => {
    const action: ArchitectureAction = {
      type: "select-head",
      head: 2,
      headCount: 4,
    };
    const result = architectureReducer(initialArchitectureState, action);

    expect(result).not.toHaveProperty("command");
    expect(result).not.toHaveProperty("workerRequest");
  });
});
