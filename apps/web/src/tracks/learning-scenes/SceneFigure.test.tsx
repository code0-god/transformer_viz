import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { type ReactElement, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SceneFigure } from "./SceneFigure";
import {
  readLearningSceneMetrics,
  resetLearningSceneMetrics,
} from "./sceneInstrumentation";
import type { LearningSceneRendererProps } from "./sceneTypes";

type TestState = Readonly<{ step: "initial" | "complete" }>;

class ObserverMock {
  static instances: ObserverMock[] = [];

  readonly callback: IntersectionObserverCallback;
  readonly options: IntersectionObserverInit;

  constructor(
    callback: IntersectionObserverCallback,
    options: IntersectionObserverInit = {},
  ) {
    this.callback = callback;
    this.options = options;
    ObserverMock.instances.push(this);
  }

  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);
  root = null;
  rootMargin = "0px";
  thresholds = [0];

  emit(isIntersecting: boolean): void {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

class ResizeObserverMock {
  readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  disconnect = vi.fn();
  unobserve = vi.fn();
  observe = vi.fn((target: Element) => {
    this.callback(
      [
        {
          target,
          contentRect: { width: 900 },
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  });
}

function MockScene({
  onContextCreated,
  onContextDisposed,
  onContextLost,
  onContextRestored,
  reducedMotion,
  state,
  viewport,
}: LearningSceneRendererProps<TestState>): ReactElement {
  useEffect(() => {
    onContextCreated();
    return onContextDisposed;
  }, [onContextCreated, onContextDisposed]);

  return (
    <>
      <div
        data-testid="mock-scene"
        data-motion={reducedMotion ? "reduced" : "full"}
        data-state={state.step}
        data-viewport={viewport}
      />
      <button type="button" onClick={onContextLost}>
        Lose context
      </button>
      <button type="button" onClick={onContextRestored}>
        Restore context
      </button>
    </>
  );
}

function sceneProps(
  loadScene = vi.fn(async () => ({ default: MockScene })),
): React.ComponentProps<typeof SceneFigure<TestState>> {
  return {
    aspectRatio: 1.55,
    controls: <button type="button">Replay</button>,
    description: "Token ID selects one embedding row.",
    fallback: <div data-testid="semantic-fallback">ID, row, vector</div>,
    figureId: "decoder.diagram.representation.embedding",
    labels: <span data-testid="scene-label">Embedding table</span>,
    loadScene,
    state: { step: "initial" },
    title: "Token ID는 어떻게 vector가 될까요?",
    webglCapability: () => true,
  };
}

function observer(rootMargin: string): ObserverMock {
  const match = ObserverMock.instances.find(
    (instance) =>
      instance.options.rootMargin === rootMargin &&
      (rootMargin !== "0px" || instance.options.threshold === 0.01),
  );
  if (match === undefined) throw new Error(`Observer ${rootMargin} missing`);
  return match;
}

describe("SceneFigure lifecycle foundation", () => {
  beforeEach(() => {
    ObserverMock.instances = [];
    resetLearningSceneMetrics();
    vi.stubGlobal(
      "IntersectionObserver",
      ObserverMock as unknown as typeof IntersectionObserver,
    );
    vi.stubGlobal(
      "ResizeObserver",
      ResizeObserverMock as unknown as typeof ResizeObserver,
    );
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        addEventListener: vi.fn(),
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test("preloads nearby but mounts only while visible", async () => {
    const loadScene = vi.fn(async () => ({ default: MockScene }));
    render(<SceneFigure {...sceneProps(loadScene)} />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Token ID는 어떻게 vector가 될까요?",
      }),
    ).toBeVisible();
    expect(screen.getByTestId("semantic-fallback")).toBeVisible();
    expect(loadScene).not.toHaveBeenCalled();

    act(() => observer("480px 0px").emit(true));
    await waitFor(() => expect(loadScene).toHaveBeenCalledOnce());
    expect(screen.queryByTestId("mock-scene")).toBeNull();

    act(() => observer("0px").emit(true));
    expect(readLearningSceneMetrics().visibleSceneIds).toEqual([
      "decoder.diagram.representation.embedding",
    ]);
    expect(
      screen.getByRole("region", {
        name: "Token ID는 어떻게 vector가 될까요?",
      }),
    ).toHaveAttribute("data-scene-visible", "true");
    expect(await screen.findByTestId("mock-scene")).toHaveAttribute(
      "data-state",
      "initial",
    );
    expect(readLearningSceneMetrics()).toMatchObject({
      activeCanvasCount: 1,
      mountCount: 1,
    });

    act(() => observer("0px").emit(false));
    expect(screen.queryByTestId("mock-scene")).toBeNull();
    expect(screen.getByTestId("semantic-fallback")).toBeVisible();
    expect(readLearningSceneMetrics()).toMatchObject({
      activeCanvasCount: 0,
      observerCount: 2,
    });
  });

  test("keeps labels on the stage and controls after the scene", () => {
    const { container } = render(<SceneFigure {...sceneProps()} />);
    const stage = container.querySelector(".scene-figure__plane");
    const controls = container.querySelector(".scene-figure__controls");
    const label = screen.getByTestId("scene-label");

    if (!(stage instanceof HTMLElement) || !(controls instanceof HTMLElement)) {
      throw new Error("Scene stage structure missing");
    }
    expect(stage).toContainElement(label);
    expect(
      stage.compareDocumentPosition(controls) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test("uses semantic fallback when WebGL is unavailable", async () => {
    const loadScene = vi.fn(async () => ({ default: MockScene }));
    render(
      <SceneFigure {...sceneProps(loadScene)} webglCapability={() => false} />,
    );

    act(() => {
      observer("480px 0px").emit(true);
      observer("0px").emit(true);
    });

    expect(screen.getByTestId("semantic-fallback")).toBeVisible();
    expect(screen.queryByTestId("mock-scene")).toBeNull();
    expect(loadScene).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        "Interactive scene을 사용할 수 없어 정적 설명을 표시합니다.",
      ),
    ).toBeVisible();
  });

  test("passes reduced motion and mobile viewport to scene", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        addEventListener: vi.fn(),
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    vi.stubGlobal(
      "ResizeObserver",
      class extends ResizeObserverMock {
        override observe = vi.fn((target: Element) => {
          this.callback(
            [
              {
                target,
                contentRect: { width: 390 },
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
        });
      } as unknown as typeof ResizeObserver,
    );
    render(<SceneFigure {...sceneProps()} />);

    act(() => {
      observer("480px 0px").emit(true);
      observer("0px").emit(true);
    });

    expect(await screen.findByTestId("mock-scene")).toHaveAttribute(
      "data-motion",
      "reduced",
    );
    expect(screen.getByTestId("mock-scene")).toHaveAttribute(
      "data-viewport",
      "mobile",
    );
    expect(
      screen.getByRole("region", {
        name: "Token ID는 어떻게 vector가 될까요?",
      }),
    ).toHaveAttribute("data-scene-motion", "reduced");
  });

  test("isolates scene loading errors behind fallback", async () => {
    const loadScene = vi.fn(async () => {
      throw new Error("SCENE_SENTINEL");
    });
    render(<SceneFigure {...sceneProps(loadScene)} />);

    act(() => {
      observer("480px 0px").emit(true);
      observer("0px").emit(true);
    });

    expect(
      await screen.findByText(
        "Interactive scene 오류로 정적 설명을 표시합니다.",
      ),
    ).toBeVisible();
    expect(screen.getByTestId("semantic-fallback")).toBeVisible();
    expect(screen.queryByTestId("mock-scene")).toBeNull();
  });

  test("shows fallback during context loss and recovers", async () => {
    render(<SceneFigure {...sceneProps()} />);
    act(() => {
      observer("480px 0px").emit(true);
      observer("0px").emit(true);
    });
    expect(await screen.findByTestId("mock-scene")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Lose context" }));
    await waitFor(() =>
      expect(screen.getByTestId("semantic-fallback")).toBeVisible(),
    );
    expect(screen.getByTestId("semantic-fallback").parentElement).toHaveClass(
      "scene-figure__fallback--overlay",
    );
    expect(
      screen.getByText("WebGL context를 복구하고 있습니다."),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Restore context" }));
    await waitFor(() => expect(screen.getByTestId("mock-scene")).toBeVisible());
    expect(readLearningSceneMetrics()).toMatchObject({
      contextLostCount: 1,
      contextRestoredCount: 1,
    });
  });

  test("releases Canvas state through twenty visibility cycles", async () => {
    const view = render(<SceneFigure {...sceneProps()} />);
    act(() => observer("480px 0px").emit(true));

    for (let cycle = 0; cycle < 20; cycle += 1) {
      act(() => observer("0px").emit(true));
      expect(await screen.findByTestId("mock-scene")).toBeVisible();
      expect(readLearningSceneMetrics()).toMatchObject({
        activeCanvasCount: 1,
        peakCanvasCount: 1,
        webglContextCount: 1,
      });

      act(() => observer("0px").emit(false));
      await waitFor(() =>
        expect(screen.queryByTestId("mock-scene")).toBeNull(),
      );
      expect(readLearningSceneMetrics()).toMatchObject({
        activeCanvasCount: 0,
        webglContextCount: 0,
      });
    }

    expect(readLearningSceneMetrics()).toMatchObject({
      activeCanvasCount: 0,
      animationFrameCount: 0,
      mountCount: 20,
      observerCount: 2,
      peakCanvasCount: 1,
      unmountCount: 20,
      webglContextCount: 0,
    });

    view.unmount();
    expect(readLearningSceneMetrics()).toMatchObject({
      observerCount: 0,
      visibleSceneIds: [],
    });
    expect(
      ObserverMock.instances.every(
        (instance) => instance.disconnect.mock.calls.length === 1,
      ),
    ).toBe(true);
  });
});
