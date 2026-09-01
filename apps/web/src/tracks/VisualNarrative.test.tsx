import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, vi } from "vitest";

import type { GuideVisualNarrativeBlock } from "./guideTypes";
import type { LearningFigureRegistry } from "./learningFigureTypes";
import { useVisualNarrative, VisualNarrative } from "./VisualNarrative";

const block: GuideVisualNarrativeBlock = {
  id: "fixture-narrative",
  kind: "visual-narrative",
  layout: "split",
  label: "Fixture narrative",
  beats: [
    {
      id: "source",
      label: "Source",
      stage: "source",
      text: "SOURCE_BEAT",
    },
    {
      id: "split",
      label: "Split",
      stage: "split",
      text: "SPLIT_BEAT",
    },
  ],
  figure: {
    id: "fixture-figure",
    kind: "figure",
    figureId: "fixture.figure",
    size: "wide",
    caption: "FIXTURE_CAPTION",
    alt: "FIXTURE_ALT",
  },
};

function NarrativeProbe() {
  const narrative = useVisualNarrative();
  return (
    <output data-testid="narrative-probe" data-stage={narrative?.activeStage} />
  );
}

const registry: LearningFigureRegistry = {
  figureIds: new Set(["fixture.figure"]),
  metadata: () => ({
    fallbackFigureId: "fixture.figure.static",
    loadingStrategy: "visible",
    preferredAspectRatio: 2,
    preferredWidth: 720,
    reducedMotion: "static-final-state",
    renderer: "scene",
  }),
  preferredWidth: () => 720,
  render: () => <NarrativeProbe />,
};

type ObserverCallback = (
  entries: IntersectionObserverEntry[],
  observer: IntersectionObserver,
) => void;

class NarrativeObserver implements IntersectionObserver {
  static current: NarrativeObserver | undefined;

  readonly root = null;
  readonly rootMargin: string;
  readonly scrollMargin = "0px";
  readonly thresholds = [0];
  readonly callback: ObserverCallback;
  readonly observed = new Set<Element>();
  disconnect = vi.fn();

  constructor(callback: ObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.rootMargin = options?.rootMargin ?? "0px";
    NarrativeObserver.current = this;
  }

  observe = (target: Element) => {
    this.observed.add(target);
  };
  takeRecords = () => [];
  unobserve = (target: Element) => {
    this.observed.delete(target);
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  NarrativeObserver.current = undefined;
});

describe("VisualNarrative", () => {
  test("escapes the prose column without changing ordinary Guide blocks", () => {
    const guideCss = readFileSync(
      resolve(process.cwd(), "src/tracks/learningGuide.css"),
      "utf8",
    );

    expect(guideCss).toMatch(
      /\.learning-guide-introduction\s*>\s*:not\(\.visual-narrative\),\s*\.learning-guide-section\s*>\s*:not\(\.visual-narrative\)\s*{\s*grid-column:\s*2;/s,
    );
  });

  test("integrates prose, semantic Figure, and deterministic initial state", () => {
    vi.stubGlobal("IntersectionObserver", NarrativeObserver);

    render(<VisualNarrative block={block} registry={registry} />);

    expect(
      screen.getByRole("region", { name: "Fixture narrative" }),
    ).toHaveAttribute("data-narrative-layout", "split");
    expect(screen.getByText("SOURCE_BEAT").tagName).toBe("P");
    expect(screen.getByRole("figure", { name: "FIXTURE_ALT" })).toBeVisible();
    expect(screen.getByText("FIXTURE_CAPTION").tagName).toBe("FIGCAPTION");
    expect(screen.getByTestId("narrative-probe")).toHaveAttribute(
      "data-stage",
      "source",
    );
    expect(screen.getByRole("button", { name: "Source" })).toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  test("supports direct keyboard progression without scroll dependency", async () => {
    vi.stubGlobal("IntersectionObserver", NarrativeObserver);
    const user = userEvent.setup();
    render(<VisualNarrative block={block} registry={registry} />);

    act(() => screen.getByRole("button", { name: "Split" }).focus());
    await user.keyboard("{Enter}");

    expect(screen.getByTestId("narrative-probe")).toHaveAttribute(
      "data-stage",
      "split",
    );
    expect(screen.getByText("SPLIT_BEAT")).toHaveAttribute(
      "data-narrative-active",
      "true",
    );
  });

  test("activates an intersecting prose beat and disconnects cleanly", () => {
    vi.stubGlobal("IntersectionObserver", NarrativeObserver);
    const { unmount } = render(
      <VisualNarrative block={block} registry={registry} />,
    );
    const observer = NarrativeObserver.current;
    if (observer === undefined) throw new Error("Narrative observer missing");
    const target = screen.getByText("SPLIT_BEAT");

    act(() => {
      observer.callback(
        [
          {
            boundingClientRect: target.getBoundingClientRect(),
            intersectionRatio: 1,
            intersectionRect: target.getBoundingClientRect(),
            isIntersecting: true,
            rootBounds: null,
            target,
            time: 0,
          },
        ],
        observer,
      );
    });
    expect(screen.getByTestId("narrative-probe")).toHaveAttribute(
      "data-stage",
      "source",
    );

    act(() => {
      window.dispatchEvent(new Event("scroll"));
      observer.callback(
        [
          {
            boundingClientRect: target.getBoundingClientRect(),
            intersectionRatio: 1,
            intersectionRect: target.getBoundingClientRect(),
            isIntersecting: true,
            rootBounds: null,
            target,
            time: 0,
          },
        ],
        observer,
      );
    });
    expect(screen.getByTestId("narrative-probe")).toHaveAttribute(
      "data-stage",
      "split",
    );
    unmount();
    expect(observer.disconnect).toHaveBeenCalledOnce();
  });

  test("resynchronizes an already intersecting beat after manual selection", () => {
    vi.stubGlobal("IntersectionObserver", NarrativeObserver);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    render(<VisualNarrative block={block} registry={registry} />);
    const source = screen.getByText("SOURCE_BEAT");
    const split = screen.getByText("SPLIT_BEAT");
    vi.spyOn(source, "getBoundingClientRect").mockReturnValue({
      bottom: 100,
      height: 80,
      left: 0,
      right: 400,
      top: 20,
      width: 400,
      x: 0,
      y: 20,
      toJSON: () => ({}),
    });
    vi.spyOn(split, "getBoundingClientRect").mockReturnValue({
      bottom: 500,
      height: 100,
      left: 0,
      right: 400,
      top: 400,
      width: 400,
      x: 0,
      y: 400,
      toJSON: () => ({}),
    });

    act(() => window.dispatchEvent(new Event("scroll")));

    expect(screen.getByTestId("narrative-probe")).toHaveAttribute(
      "data-stage",
      "split",
    );
  });
});
