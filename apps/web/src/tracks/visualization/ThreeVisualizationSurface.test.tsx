import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import {
  type ThreeVisualizationRendererProps,
  ThreeVisualizationSurface,
} from "./ThreeVisualizationSurface";

function FallbackTable() {
  return <table aria-label="Score Matrix fallback" />;
}

function WorkingRenderer({
  onContextLost,
  onContextRestored,
}: ThreeVisualizationRendererProps) {
  return (
    <div data-testid="three-renderer">
      <button type="button" onClick={onContextLost}>
        lose
      </button>
      <button type="button" onClick={onContextRestored}>
        restore
      </button>
    </div>
  );
}

function BrokenRenderer(): never {
  throw new Error("renderer exploded");
}

describe("ThreeVisualizationSurface", () => {
  test("keeps HTML fallback and skips lazy renderer without WebGL", () => {
    const loadRenderer = vi.fn(async () => ({ default: WorkingRenderer }));
    const isWebGLAvailable = vi.fn(() => false);

    const rendered = render(
      <ThreeVisualizationSurface
        title="Score Matrix"
        loadRenderer={loadRenderer}
        rendererProps={{}}
        isWebGLAvailable={isWebGLAvailable}
        fallback={<FallbackTable />}
      />,
    );

    expect(
      screen.getByRole("table", { name: "Score Matrix fallback" }),
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveAttribute(
      "data-visualization-state",
      "unavailable",
    );
    expect(screen.getByText("2D 데이터 보기")).toBeVisible();
    expect(loadRenderer).not.toHaveBeenCalled();
    rendered.rerender(
      <ThreeVisualizationSurface
        title="Score Matrix"
        loadRenderer={loadRenderer}
        rendererProps={{ selection: "changed" }}
        isWebGLAvailable={isWebGLAvailable}
        fallback={<FallbackTable />}
      />,
    );
    expect(isWebGLAvailable).toHaveBeenCalledOnce();
  });

  test("opens fallback and remounts renderer after context loss", async () => {
    const user = userEvent.setup();
    const loadRenderer = vi.fn(async () => ({ default: WorkingRenderer }));

    render(
      <ThreeVisualizationSurface
        title="Score Matrix"
        loadRenderer={loadRenderer}
        rendererProps={{}}
        isWebGLAvailable={() => true}
        fallback={<FallbackTable />}
      />,
    );

    expect(await screen.findByTestId("three-renderer")).toBeVisible();
    expect(
      screen.getByRole("table", { name: "Score Matrix fallback" }),
    ).not.toBeVisible();
    await user.click(screen.getByRole("button", { name: "lose" }));
    expect(screen.getByRole("alert")).toHaveAttribute(
      "data-visualization-state",
      "context-lost",
    );
    expect(
      screen.getByRole("table", { name: "Score Matrix fallback" }),
    ).toBeVisible();
    const callsBeforeRestart = loadRenderer.mock.calls.length;

    await user.click(
      screen.getByRole("button", { name: "3D 시각화 다시 시작" }),
    );
    expect(await screen.findByTestId("three-renderer")).toBeVisible();
    expect(loadRenderer).toHaveBeenCalledTimes(callsBeforeRestart + 1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("contains renderer failures without losing accessible data", async () => {
    render(
      <ThreeVisualizationSurface
        title="Score Matrix"
        loadRenderer={async () => ({ default: BrokenRenderer })}
        rendererProps={{}}
        isWebGLAvailable={() => true}
        fallback={<FallbackTable />}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveAttribute(
      "data-visualization-state",
      "error",
    );
    expect(
      screen.getByRole("table", { name: "Score Matrix fallback" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "3D 시각화 다시 시작" }),
    ).toBeVisible();
  });
});
