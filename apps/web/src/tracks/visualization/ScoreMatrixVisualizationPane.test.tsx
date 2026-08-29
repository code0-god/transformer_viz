import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { ScoreMatrixVisualizationPane } from "./ScoreMatrixVisualizationPane";
import type { ScoreMatrixModel } from "./scoreMatrixModel";
import type { ScoreMatrixInspectionState } from "./scoreMatrixState";
import { SCORE_MATRIX_VISUALIZATION_ID } from "./visualizationRegistry";

const model: ScoreMatrixModel = {
  layer: 1,
  head: 2,
  size: 2,
  queryTokenLabels: ["the", "cat"],
  keyTokenLabels: ["the", "cat"],
  cells: [
    {
      queryIndex: 0,
      keyIndex: 0,
      queryTokenLabel: "the",
      keyTokenLabel: "the",
      value: 0.25,
      allowed: true,
      blockedByLaterCausalMask: false,
    },
    {
      queryIndex: 0,
      keyIndex: 1,
      queryTokenLabel: "the",
      keyTokenLabel: "cat",
      value: -0.5,
      allowed: false,
      blockedByLaterCausalMask: true,
    },
    {
      queryIndex: 1,
      keyIndex: 0,
      queryTokenLabel: "cat",
      keyTokenLabel: "the",
      value: 1,
      allowed: true,
      blockedByLaterCausalMask: false,
    },
    {
      queryIndex: 1,
      keyIndex: 1,
      queryTokenLabel: "cat",
      keyTokenLabel: "cat",
      value: 0,
      allowed: true,
      blockedByLaterCausalMask: false,
    },
  ],
};

const provenance = {
  requestId: 3,
  generationRunId: 7,
  runId: 20,
  layer: 1,
  head: 2,
} as const;

function renderPane(state: ScoreMatrixInspectionState, replayAvailable = true) {
  const onInspect = vi.fn();
  render(
    <ScoreMatrixVisualizationPane
      visualizationId={SCORE_MATRIX_VISUALIZATION_ID}
      state={state}
      replayAvailable={replayAvailable}
      selectedLayer={1}
      selectedHead={2}
      selectedStep={3}
      onInspect={onInspect}
      isWebGLAvailable={() => false}
    />,
  );
  return onInspect;
}

describe("ScoreMatrixVisualizationPane", () => {
  test("requires real replay evidence before inspection", () => {
    renderPane({ status: "idle" }, false);

    expect(screen.getByRole("link", { name: /모델 실험실/ })).toHaveAttribute(
      "href",
      "#/lab",
    );
    expect(screen.queryByRole("button", { name: /Score/ })).toBeNull();
  });

  test("requests selected layer and head from the actual trace", async () => {
    const user = userEvent.setup();
    const onInspect = renderPane({ status: "idle" });

    await user.click(
      screen.getByRole("button", { name: "Layer 2, Head 3 Score 불러오기" }),
    );

    expect(onInspect).toHaveBeenCalledTimes(1);
  });

  test("contains loading and inspection errors locally", () => {
    const { rerender } = render(
      <ScoreMatrixVisualizationPane
        visualizationId={SCORE_MATRIX_VISUALIZATION_ID}
        state={{ status: "loading", provenance }}
        replayAvailable
        selectedLayer={1}
        selectedHead={2}
        onInspect={() => undefined}
      />,
    );
    expect(screen.getByRole("status")).toHaveAttribute(
      "data-score-matrix-state",
      "loading",
    );

    rerender(
      <ScoreMatrixVisualizationPane
        visualizationId={SCORE_MATRIX_VISUALIZATION_ID}
        state={{ status: "error", provenance, message: "trace unavailable" }}
        replayAvailable
        selectedLayer={1}
        selectedHead={2}
        onInspect={() => undefined}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("trace unavailable");
  });

  test("keeps exact HTML data open when WebGL is unavailable", () => {
    renderPane({ status: "ready", provenance, model });

    const toolbar = screen.getByRole("toolbar", { name: "3D 보기 도구" });
    expect(toolbar).toHaveAttribute(
      "data-threeui-surface",
      "score-matrix-controls",
    );
    expect(
      toolbar.closest('[data-threeui-surface="score-matrix"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-visualization-state="unavailable"]'),
    ).toBeVisible();
    expect(
      screen.getByRole("table", { name: /Layer 2, Head 3 exact values/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("cell", {
        name: /질의 0 the, 키 1 cat: -0.5, 이후 토큰 인과 마스크로 차단됨/,
      }),
    ).toBeVisible();
  });

  test("presents one viewer title, clear axes, and selectable 3D or 2D data", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ScoreMatrixVisualizationPane
        visualizationId={SCORE_MATRIX_VISUALIZATION_ID}
        state={{ status: "ready", provenance, model }}
        replayAvailable
        selectedLayer={1}
        selectedHead={2}
        selectedStep={3}
        onInspect={vi.fn()}
        isWebGLAvailable={() => false}
      />,
    );

    expect(
      screen.queryByRole("heading", { name: "Attention Score Matrix" }),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector(".score-matrix-visualization__context p"),
    ).toHaveTextContent("Layer 2 · Head 3 · Step 4");
    expect(screen.getByRole("button", { name: "3D Surface" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      container.querySelector('[aria-label="Query axis"]'),
    ).toHaveTextContent('q0 · "the"');
    expect(
      container.querySelector('[aria-label="Key axis"]'),
    ).toHaveTextContent('k1 · "cat"');
    expect(
      container.querySelector(".score-matrix-zero-plane"),
    ).toHaveTextContent("0 plane");

    await screen.findByRole("table");
    const modeButton = screen.getByRole("button", { name: "2D Matrix" });
    expect(modeButton).toBeInTheDocument();
    fireEvent.click(modeButton);
    expect(
      await screen.findByRole("button", {
        name: "2D Matrix",
        pressed: true,
      }),
    ).toBeInTheDocument();
    expect(container.querySelector("[data-score-matrix-mode]")).toHaveAttribute(
      "data-score-matrix-mode",
      "2d",
    );
    expect(screen.getByRole("table")).toBeVisible();

    await user.click(
      screen.getByRole("button", {
        name: /질의 0 the, 키 0 the:/,
      }),
    );
    expect(
      container.querySelector(
        '.score-matrix-selection--primary [data-selected-axis="query"]',
      ),
    ).toHaveTextContent('0 · "the"');
  });

  test("resets local selection when trace provenance changes", async () => {
    const { rerender } = render(
      <ScoreMatrixVisualizationPane
        visualizationId={SCORE_MATRIX_VISUALIZATION_ID}
        state={{ status: "ready", provenance, model }}
        replayAvailable
        selectedLayer={1}
        selectedHead={2}
        onInspect={() => undefined}
        isWebGLAvailable={() => false}
      />,
    );
    await screen.findByRole("table");
    fireEvent.click(
      screen.getByRole("button", {
        name: /질의 0 the, 키 1 cat: -0.5/,
      }),
    );
    expect(
      document.querySelector(
        '.score-matrix-selection--primary [data-selected-axis="query"]',
      ),
    ).toHaveTextContent('0 · "the"');

    rerender(
      <ScoreMatrixVisualizationPane
        visualizationId={SCORE_MATRIX_VISUALIZATION_ID}
        state={{
          status: "ready",
          provenance: { ...provenance, requestId: 4, runId: 21 },
          model,
        }}
        replayAvailable
        selectedLayer={1}
        selectedHead={2}
        onInspect={() => undefined}
        isWebGLAvailable={() => false}
      />,
    );

    expect(
      document.querySelector(
        '.score-matrix-selection--primary [data-selected-axis="query"]',
      ),
    ).toBeNull();
    expect(
      document.querySelector(".score-matrix-selection--primary"),
    ).toHaveAttribute("data-selected", "false");
  });
});
