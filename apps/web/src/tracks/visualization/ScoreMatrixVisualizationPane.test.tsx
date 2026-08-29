import { render, screen } from "@testing-library/react";
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

  test("resets local selection when trace provenance changes", async () => {
    const user = userEvent.setup();
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
    await user.click(
      screen.getByRole("button", {
        name: /질의 0 the, 키 1 cat: -0.5/,
      }),
    );
    expect(screen.getAllByText(/선택: 질의 0 the, 키 1 cat/)).not.toHaveLength(
      0,
    );

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

    expect(screen.queryByText(/선택: 질의 0 the, 키 1 cat/)).toBeNull();
    expect(screen.getAllByText("선택된 셀 없음")).not.toHaveLength(0);
  });
});
