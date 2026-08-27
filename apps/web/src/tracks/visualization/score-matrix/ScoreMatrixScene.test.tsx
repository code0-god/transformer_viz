import { act, render } from "@testing-library/react";
import { StrictMode } from "react";
import { vi } from "vitest";

import type { ScoreMatrixModel } from "../scoreMatrixModel";

const seams = vi.hoisted(() => {
  class FakeTarget {
    readonly set = vi.fn();
  }

  class FakeOrbitControls {
    readonly target = new FakeTarget();
    readonly addEventListener = vi.fn();
    readonly removeEventListener = vi.fn();
    readonly dispose = vi.fn();
    readonly update = vi.fn();
    readonly saveState = vi.fn();
    readonly reset = vi.fn();
    readonly rotateLeft = vi.fn();
    readonly rotateUp = vi.fn();
    readonly pan = vi.fn();
    readonly dollyIn = vi.fn();
    readonly dollyOut = vi.fn();
    minAzimuthAngle = 0;
    maxAzimuthAngle = 0;
    minPolarAngle = 0;
    maxPolarAngle = 0;
    minDistance = 0;
    maxDistance = 0;
    enableDamping = true;
    enabled = true;

    constructor() {
      controls.push(this);
    }
  }

  const controls: FakeOrbitControls[] = [];
  const frameCallbacks: Array<() => void> = [];
  return {
    canvas: vi.fn((_props: unknown) => null),
    invalidate: vi.fn(),
    camera: {},
    element: document.createElement("canvas"),
    controls,
    frameCallbacks,
    FakeOrbitControls,
  };
});

vi.mock("@react-three/fiber", () => ({
  Canvas: seams.canvas,
  invalidate: seams.invalidate,
  useThree: () => ({
    camera: seams.camera,
    gl: { domElement: seams.element },
    invalidate: seams.invalidate,
  }),
  useFrame: (callback: () => void) => {
    seams.frameCallbacks.push(callback);
  },
}));

vi.mock("three/addons/controls/OrbitControls.js", () => ({
  OrbitControls: seams.FakeOrbitControls,
}));

import ScoreMatrixScene, {
  OrbitController,
  RenderReadySignal,
  WebGLContextEvents,
} from "./ScoreMatrixScene";

const model: ScoreMatrixModel = {
  layer: 0,
  head: 0,
  size: 1,
  queryTokenLabels: ["토큰"],
  keyTokenLabels: ["토큰"],
  cells: [
    {
      queryIndex: 0,
      keyIndex: 0,
      queryTokenLabel: "토큰",
      keyTokenLabel: "토큰",
      value: 1,
      allowed: true,
      blockedByLaterCausalMask: false,
    },
  ],
};

describe("ScoreMatrixScene rendering policy", () => {
  beforeEach(() => {
    seams.canvas.mockClear();
    seams.invalidate.mockClear();
    seams.controls.length = 0;
    seams.frameCallbacks.length = 0;
    seams.element.removeAttribute("data-render-state");
    seams.element.removeAttribute("data-render-count");
  });

  test("signals only after Fiber renders the first real frame", () => {
    const rendered = render(<RenderReadySignal />);

    expect(seams.element).not.toHaveAttribute("data-render-state");
    act(() => seams.frameCallbacks[0]?.());
    expect(seams.element).toHaveAttribute("data-render-state", "ready");
    expect(seams.element).toHaveAttribute("data-render-count", "1");
    act(() => seams.frameCallbacks[0]?.());
    expect(seams.element).toHaveAttribute("data-render-count", "2");

    rendered.unmount();
    expect(seams.element).not.toHaveAttribute("data-render-state");
    expect(seams.element).not.toHaveAttribute("data-render-count");
  });

  test("uses demand rendering, bounded DPR, and no continuous animation frame", () => {
    // Given: a valid matrix and a browser frame scheduler seam.
    const requestFrame = vi.spyOn(window, "requestAnimationFrame");

    // When: the scene renders without a camera command.
    render(
      <ScoreMatrixScene
        model={model}
        selectedCellKey={null}
        onSelect={vi.fn()}
        cameraCommand={null}
        onContextLost={vi.fn()}
        onContextRestored={vi.fn()}
        reducedMotion={false}
      />,
    );

    // Then: Fiber is demand-driven and the renderer starts no RAF loop.
    expect(seams.canvas).toHaveBeenCalledOnce();
    expect(seams.canvas.mock.calls[0]?.[0]).toMatchObject({
      frameloop: "demand",
      dpr: [1, 2],
    });
    expect(requestFrame).not.toHaveBeenCalled();
    requestFrame.mockRestore();
  });

  test("keeps bounded controls usable without damping under reduced motion", () => {
    // Given: reduced motion and a discrete rotate command.
    // When: the controller mounts.
    const rendered = render(
      <OrbitController
        reducedMotion={true}
        cameraCommand={{ id: 1, kind: "rotate", horizontal: 1, vertical: -1 }}
      />,
    );

    // Then: camera motion is bounded, immediate, and invalidates once changed.
    const controls = seams.controls[0];
    expect(controls).toBeDefined();
    expect(controls).toMatchObject({
      minAzimuthAngle: -Math.PI / 4,
      maxAzimuthAngle: Math.PI / 4,
      minPolarAngle: Math.PI / 6,
      maxPolarAngle: Math.PI / 2.1,
      minDistance: 4,
      maxDistance: 18,
      enableDamping: false,
      enabled: true,
    });
    expect(controls?.target.set).toHaveBeenCalledWith(0, 0, 0);
    expect(controls?.rotateLeft).toHaveBeenCalled();
    expect(controls?.rotateUp).toHaveBeenCalled();
    expect(controls?.update).toHaveBeenCalled();

    // When: the controller unmounts.
    rendered.unmount();

    // Then: listeners and controls are cleaned up exactly once.
    expect(controls?.removeEventListener).toHaveBeenCalledOnce();
    expect(controls?.dispose).toHaveBeenCalledOnce();
  });

  test("applies one camera command only once across StrictMode effect replay", () => {
    // Given: a reset command mounted under React StrictMode.
    // When: setup-cleanup-setup replays the controller effects.
    render(
      <StrictMode>
        <OrbitController
          reducedMotion={false}
          cameraCommand={{ id: 7, kind: "reset" }}
        />
      </StrictMode>,
    );

    // Then: the command is not duplicated against the persistent camera.
    expect(
      seams.controls.reduce(
        (count, controls) => count + controls.reset.mock.calls.length,
        0,
      ),
    ).toBe(1);
  });

  test("registers context callbacks idempotently under StrictMode and removes them", () => {
    // Given: stable context callbacks and listener spies.
    const add = vi.spyOn(seams.element, "addEventListener");
    const remove = vi.spyOn(seams.element, "removeEventListener");
    const onContextLost = vi.fn();
    const onContextRestored = vi.fn();

    // When: the event bridge experiences StrictMode setup-cleanup-setup.
    const rendered = render(
      <StrictMode>
        <WebGLContextEvents
          onContextLost={onContextLost}
          onContextRestored={onContextRestored}
        />
      </StrictMode>,
    );
    seams.element.dispatchEvent(
      new Event("webglcontextlost", { cancelable: true }),
    );
    seams.element.dispatchEvent(new Event("webglcontextrestored"));

    // Then: only the live lease handles each event.
    expect(onContextLost).toHaveBeenCalledOnce();
    expect(onContextRestored).toHaveBeenCalledOnce();

    // When: the final lease is released.
    rendered.unmount();

    // Then: every registration has a matching removal.
    expect(remove).toHaveBeenCalledTimes(add.mock.calls.length);
    add.mockRestore();
    remove.mockRestore();
  });
});
