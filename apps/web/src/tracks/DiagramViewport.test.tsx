import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";

import { DiagramViewport } from "./DiagramViewport";

const observers: TestResizeObserver[] = [];

class TestResizeObserver implements ResizeObserver {
  readonly #callback: ResizeObserverCallback;
  readonly observed = new Set<Element>();
  disconnected = false;

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
    observers.push(this);
  }

  disconnect(): void {
    this.disconnected = true;
    this.observed.clear();
  }

  observe(target: Element): void {
    this.observed.add(target);
  }

  unobserve(target: Element): void {
    this.observed.delete(target);
  }

  trigger(): void {
    if (this.disconnected) return;
    this.#callback([], this);
  }
}

globalThis.ResizeObserver = TestResizeObserver;

function diagram(): ReactElement {
  return <svg role="img" aria-label="Test diagram" viewBox="0 0 1000 500" />;
}

function renderViewport(resetKey = "chapter-1") {
  const rendered = render(
    <DiagramViewport
      label="학습 다이어그램"
      resetKey={resetKey}
      extraControls={<button type="button">노드 찾기</button>}
    >
      {diagram()}
    </DiagramViewport>,
  );
  const viewport = screen.getByTestId("diagram-viewport-surface");
  viewport.getBoundingClientRect = () => new DOMRect(10, 20, 500, 500);
  Object.defineProperties(viewport, {
    setPointerCapture: { value: vi.fn(), configurable: true },
    releasePointerCapture: { value: vi.fn(), configurable: true },
  });
  act(() => observers.at(-1)?.trigger());
  return { ...rendered, viewport };
}

function transformValues(viewport: HTMLElement): {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
} {
  return {
    scale: Number(viewport.getAttribute("data-scale")),
    x: Number(viewport.getAttribute("data-pan-x")),
    y: Number(viewport.getAttribute("data-pan-y")),
  };
}

describe("DiagramViewport", () => {
  test("defaults to Fit with the full SVG visible and centered", () => {
    // Given / When
    const { viewport } = renderViewport();

    // Then
    expect(viewport).toHaveAttribute("data-viewport-mode", "fit");
    expect(viewport).toHaveAttribute("data-fit-scale", "0.5");
    expect(viewport).toHaveAttribute("data-scale", "0.5");
    expect(viewport).toHaveAttribute("data-pan-x", "0");
    expect(viewport).toHaveAttribute("data-pan-y", "125");
    expect(viewport).toHaveAttribute("data-content-width", "1000");
    expect(viewport).toHaveAttribute("data-content-height", "500");
  });

  test("includes a visible figure caption in Fit geometry", () => {
    render(
      <DiagramViewport label="학습 다이어그램" resetKey="captioned">
        <figure>
          <svg
            role="img"
            aria-label="Captioned diagram"
            viewBox="0 0 1000 500"
          />
          <figcaption>Diagram metadata</figcaption>
        </figure>
      </DiagramViewport>,
    );
    const viewport = screen.getByTestId("diagram-viewport-surface");
    const caption = screen.getByText("Diagram metadata");
    viewport.getBoundingClientRect = () => new DOMRect(0, 0, 500, 500);
    caption.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 80);

    act(() => observers.at(-1)?.trigger());

    expect(viewport).toHaveAttribute("data-content-width", "1000");
    expect(viewport).toHaveAttribute("data-content-height", "580");
    expect(viewport).toHaveAttribute("data-fit-scale", "0.5");
    expect(viewport).toHaveAttribute("data-pan-y", "105");
  });

  test("zooms with plus and minus without going below Fit", async () => {
    // Given
    const user = userEvent.setup();
    const { viewport } = renderViewport();
    const toolbar = screen.getByRole("toolbar", {
      name: "다이어그램 보기 도구",
    });

    // When
    await user.click(within(toolbar).getByRole("button", { name: "확대" }));

    // Then
    expect(viewport).toHaveAttribute("data-scale", "0.6");
    expect(within(toolbar).getByRole("button", { name: "축소" })).toBeEnabled();

    // When
    await user.click(within(toolbar).getByRole("button", { name: "축소" }));

    // Then
    expect(viewport).toHaveAttribute("data-scale", "0.5");
    expect(
      within(toolbar).getByRole("button", { name: "축소" }),
    ).toBeDisabled();
  });

  test("uses Ctrl+wheel only and zooms around the pointer", () => {
    // Given
    const { viewport } = renderViewport();
    const normalWheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      clientX: 210,
      clientY: 120,
      deltaY: -100,
    });

    // When
    act(() => {
      viewport.dispatchEvent(normalWheel);
    });

    // Then
    expect(normalWheel.defaultPrevented).toBe(false);
    expect(transformValues(viewport)).toEqual({ scale: 0.5, x: 0, y: 125 });

    // When
    const controlWheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      clientX: 210,
      clientY: 120,
      ctrlKey: true,
      deltaY: -100,
    });
    act(() => {
      viewport.dispatchEvent(controlWheel);
    });

    // Then
    expect(controlWheel.defaultPrevented).toBe(true);
    expect(transformValues(viewport)).toEqual({ scale: 0.6, x: -40, y: 100 });
  });

  test("starts drag pan only above Fit and after the movement threshold", async () => {
    // Given
    const user = userEvent.setup();
    const { viewport } = renderViewport();

    // When: dragging at Fit is ignored.
    fireEvent.pointerDown(viewport, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(viewport, {
      pointerId: 1,
      clientX: 130,
      clientY: 140,
    });
    fireEvent.pointerUp(viewport, { pointerId: 1 });

    // Then
    expect(transformValues(viewport)).toEqual({ scale: 0.5, x: 0, y: 125 });

    // Given: zoom enables panning.
    await user.click(screen.getByRole("button", { name: "확대" }));
    const beforeDrag = transformValues(viewport);

    // When: movement remains beneath the threshold.
    fireEvent.pointerDown(viewport, {
      pointerId: 2,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(viewport, {
      pointerId: 2,
      clientX: 102,
      clientY: 102,
    });

    // Then
    expect(transformValues(viewport)).toEqual(beforeDrag);

    // When: movement crosses the threshold.
    fireEvent.pointerMove(viewport, {
      pointerId: 2,
      clientX: 120,
      clientY: 130,
    });
    fireEvent.pointerUp(viewport, { pointerId: 2 });

    // Then
    expect(transformValues(viewport)).not.toEqual(beforeDrag);
    expect(viewport).toHaveAttribute("data-dragging", "false");
  });

  test("Fit resets zoom and pan", async () => {
    // Given
    const user = userEvent.setup();
    const { viewport } = renderViewport();
    await user.click(screen.getByRole("button", { name: "확대" }));
    fireEvent.pointerDown(viewport, {
      pointerId: 3,
      clientX: 200,
      clientY: 200,
    });
    fireEvent.pointerMove(viewport, {
      pointerId: 3,
      clientX: 240,
      clientY: 240,
    });
    fireEvent.pointerUp(viewport, { pointerId: 3 });

    // When
    await user.click(screen.getByRole("button", { name: "전체 보기" }));

    // Then
    expect(transformValues(viewport)).toEqual({ scale: 0.5, x: 0, y: 125 });
    expect(viewport).toHaveAttribute("data-viewport-mode", "fit");
  });

  test("ResizeObserver refits to changed viewport geometry", async () => {
    // Given
    const user = userEvent.setup();
    const { viewport } = renderViewport();
    await user.click(screen.getByRole("button", { name: "확대" }));
    viewport.getBoundingClientRect = () => new DOMRect(10, 20, 250, 400);

    // When
    act(() => observers.at(-1)?.trigger());

    // Then
    expect(transformValues(viewport)).toEqual({ scale: 0.25, x: 0, y: 137.5 });
  });

  test("resetKey changes refit the current chapter diagram", async () => {
    // Given
    const user = userEvent.setup();
    const { rerender, viewport } = renderViewport();
    await user.click(screen.getByRole("button", { name: "확대" }));

    // When
    rerender(
      <DiagramViewport label="학습 다이어그램" resetKey="chapter-2">
        {diagram()}
      </DiagramViewport>,
    );

    // Then
    expect(transformValues(viewport)).toEqual({ scale: 0.5, x: 0, y: 125 });
  });

  test("disconnects old ResizeObserver leases on reset and unmount", () => {
    const rendered = renderViewport();
    const firstObserver = observers.at(-1);
    expect(firstObserver?.observed.size).toBe(3);

    rendered.rerender(
      <DiagramViewport label="학습 다이어그램" resetKey="chapter-2">
        {diagram()}
      </DiagramViewport>,
    );
    expect(firstObserver?.disconnected).toBe(true);
    const secondObserver = observers.at(-1);
    expect(secondObserver).not.toBe(firstObserver);

    rendered.unmount();
    expect(secondObserver?.disconnected).toBe(true);
  });

  test("exposes an accessible region, toolbar, controls, and extra actions", () => {
    // Given / When
    renderViewport();

    // Then
    const region = screen.getByRole("region", { name: "학습 다이어그램" });
    const toolbar = within(region).getByRole("toolbar", {
      name: "다이어그램 보기 도구",
    });
    expect(
      within(toolbar).getByRole("button", { name: "축소" }),
    ).toHaveAttribute("type", "button");
    expect(within(toolbar).getByRole("button", { name: "확대" })).toBeEnabled();
    expect(
      within(toolbar).getByRole("button", { name: "전체 보기" }),
    ).toBeDisabled();
    expect(
      within(toolbar).getByRole("button", { name: "노드 찾기" }),
    ).toBeVisible();
    expect(screen.getByRole("img", { name: "Test diagram" })).toBeVisible();
  });
});
