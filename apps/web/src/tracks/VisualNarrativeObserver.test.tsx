import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { GuideVisualNarrativeBlock } from "./guideTypes";
import type { LearningFigureRegistry } from "./learningFigureTypes";
import { VisualNarrative } from "./VisualNarrative";

const beats = [
  {
    id: "source",
    label: "Source",
    stage: "source",
    text: "SOURCE_BEAT",
  },
  {
    id: "next",
    label: "Next",
    stage: "next",
    text: "NEXT_BEAT",
  },
] as const;

function narrative(layout: "golden" | "split"): GuideVisualNarrativeBlock {
  return {
    id: `fixture-${layout}`,
    kind: "visual-narrative",
    layout,
    label: `${layout} narrative`,
    beats,
    figure: {
      id: `fixture-${layout}-figure`,
      kind: "figure",
      figureId: "fixture.figure",
      size: "wide",
      caption: "Fixture caption",
      alt: "Fixture visual",
    },
  };
}

const registry: LearningFigureRegistry = {
  figureIds: new Set(["fixture.figure"]),
  metadata: () => ({
    fallbackFigureId: "fixture.figure.static",
    loadingStrategy: "visible",
    preferredAspectRatio: 2,
    preferredWidth: 720,
    reducedMotion: "static-final-state",
    renderer: "static",
  }),
  preferredWidth: () => 720,
  render: () => <span>FIXTURE_VISUAL</span>,
};

type ObserverCallback = (
  entries: IntersectionObserverEntry[],
  observer: IntersectionObserver,
) => void;

class ObserverProbe implements IntersectionObserver {
  static current: ObserverProbe | undefined;

  readonly root = null;
  readonly rootMargin: string;
  readonly scrollMargin = "0px";
  readonly thresholds = [0];
  readonly callback: ObserverCallback;
  disconnect = vi.fn();

  constructor(callback: ObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.rootMargin = options?.rootMargin ?? "0px";
    ObserverProbe.current = this;
  }

  observe = vi.fn();
  takeRecords = () => [];
  unobserve = vi.fn();
}

function rect(top: number, height: number): DOMRect {
  return {
    bottom: top + height,
    height,
    left: 0,
    right: 400,
    top,
    width: 400,
    x: 0,
    y: top,
    toJSON: () => ({}),
  };
}

function entry(target: Element, box: DOMRect): IntersectionObserverEntry {
  return {
    boundingClientRect: box,
    intersectionRatio: 1,
    intersectionRect: box,
    isIntersecting: true,
    rootBounds: null,
    target,
    time: 0,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  ObserverProbe.current = undefined;
});

describe("VisualNarrative observer geometry", () => {
  test("preserves the non-Golden center and root-margin contract", () => {
    vi.stubGlobal("IntersectionObserver", ObserverProbe);
    vi.stubGlobal("innerHeight", 1000);
    render(<VisualNarrative block={narrative("split")} registry={registry} />);
    const observer = ObserverProbe.current;
    if (observer === undefined) throw new Error("Observer missing");
    const source = screen.getByText("SOURCE_BEAT");
    const next = screen.getByText("NEXT_BEAT");

    act(() => {
      window.dispatchEvent(new Event("scroll"));
      observer.callback(
        [entry(source, rect(420, 80)), entry(next, rect(470, 100))],
        observer,
      );
    });

    expect(observer.rootMargin).toBe("-34% 0px -46% 0px");
    expect(next).toHaveAttribute("data-narrative-active", "true");
  });

  test("rebuilds the Golden observer after crossing the narrow breakpoint", () => {
    vi.stubGlobal("IntersectionObserver", ObserverProbe);
    let narrow = false;
    const listeners = new Set<() => void>();
    const removeListener = vi.fn((_type: string, listener: () => void) => {
      listeners.delete(listener);
    });
    vi.stubGlobal("matchMedia", () => ({
      matches: narrow,
      media: "(max-width: 48rem)",
      onchange: null,
      addEventListener: (_type: string, listener: () => void) => {
        listeners.add(listener);
      },
      removeEventListener: removeListener,
      dispatchEvent: () => true,
    }));
    const { unmount } = render(
      <VisualNarrative block={narrative("golden")} registry={registry} />,
    );
    const desktopObserver = ObserverProbe.current;
    if (desktopObserver === undefined) throw new Error("Observer missing");
    expect(desktopObserver.rootMargin).toBe("-34% 0px -46% 0px");

    narrow = true;
    act(() => {
      for (const listener of listeners) listener();
    });
    const mobileObserver = ObserverProbe.current;
    if (mobileObserver === undefined) throw new Error("Observer missing");

    expect(mobileObserver).not.toBe(desktopObserver);
    expect(desktopObserver.disconnect).toHaveBeenCalledOnce();
    expect(mobileObserver.rootMargin).toBe("-68% 0px -8% 0px");

    unmount();
    expect(mobileObserver.disconnect).toHaveBeenCalledOnce();
    expect(removeListener).toHaveBeenCalledOnce();
  });
});
