import { vi } from "vitest";

import {
  activateLearningFocus,
  createLearningFocusRegistry,
  createLearningFocusState,
  synchronizeLearningRoute,
} from "./learningFocus";

const rootRoute = "decoder.root" as const;
const blockRoute = "decoder.block" as const;
const embeddingNode = "decoder.root.token-embedding" as const;
const blockNode = "decoder.block.self-attention" as const;

describe("learning focus transitions", () => {
  test("records diagram and Guide origins when activation repeats", () => {
    // Given
    const initial = createLearningFocusState(rootRoute);
    const diagramRequest = {
      origin: "diagram",
      routeId: rootRoute,
      sectionId: "embedding",
      highlightedNodeIds: [embeddingNode],
    } as const;

    // When
    const first = activateLearningFocus(initial, diagramRequest);
    const repeated = activateLearningFocus(first, diagramRequest);
    const guide = activateLearningFocus(repeated, {
      ...diagramRequest,
      origin: "guide",
    });

    // Then
    expect(first.origin).toBe("diagram");
    expect(repeated).not.toBe(first);
    expect(guide).toEqual({
      routeId: rootRoute,
      activeSectionId: "embedding",
      highlightedNodeIds: [embeddingNode],
      origin: "guide",
    });
  });

  test("ignores activation arriving from a stale route", () => {
    // Given
    const current = createLearningFocusState(blockRoute);

    // When
    const staleActivation = activateLearningFocus(current, {
      origin: "guide",
      routeId: rootRoute,
      sectionId: "embedding",
      highlightedNodeIds: [embeddingNode],
    });

    // Then
    expect(staleActivation).toBe(current);
  });

  test("resets on a route change and preserves focus within a route", () => {
    // Given
    const focused = activateLearningFocus(
      createLearningFocusState(blockRoute),
      {
        origin: "diagram",
        routeId: blockRoute,
        sectionId: "attention",
        highlightedNodeIds: [blockNode],
      },
    );

    // When
    const afterLayerOrHeadChange = synchronizeLearningRoute(
      focused,
      blockRoute,
    );
    const afterRouteChange = synchronizeLearningRoute(focused, rootRoute);

    // Then
    expect(afterLayerOrHeadChange).toBe(focused);
    expect(afterRouteChange).toEqual({
      routeId: rootRoute,
      activeSectionId: null,
      highlightedNodeIds: [],
      origin: "route",
    });
  });
});

describe("learning focus registry", () => {
  test.each([
    { reducedMotion: false, behavior: "smooth" },
    { reducedMotion: true, behavior: "auto" },
  ] as const)(
    "reveals the nearest edge with $behavior motion and transfers focus explicitly",
    ({ reducedMotion, behavior }) => {
      // Given
      const statuses = vi.fn();
      const scrollBy = vi.fn();
      const container = document.createElement("div");
      const target = document.createElement("button");
      container.append(target);
      document.body.append(container);
      Object.defineProperty(container, "scrollBy", { value: scrollBy });
      vi.spyOn(container, "getBoundingClientRect").mockReturnValue(
        new DOMRect(0, 0, 300, 200),
      );
      vi.spyOn(target, "getBoundingClientRect").mockReturnValue(
        new DOMRect(260, 180, 80, 60),
      );
      const registry = createLearningFocusRegistry({
        prefersReducedMotion: () => reducedMotion,
        reportStatus: statuses,
      });
      const unregister = registry.register(
        {
          kind: "node",
          routeId: rootRoute,
          nodeId: embeddingNode,
        },
        target,
        container,
      );

      // When
      const revealed = registry.reveal(
        { kind: "node", routeId: rootRoute, nodeId: embeddingNode },
        { focus: true },
      );

      // Then
      expect(revealed).toBe(true);
      expect(document.activeElement).toBe(target);
      expect(scrollBy).toHaveBeenCalledWith({
        top: 40,
        left: 40,
        behavior,
      });
      expect(statuses).toHaveBeenCalledWith({ availability: "available" });

      unregister();
      container.remove();
    },
  );

  test("ignores stale unregister calls and reports an unmounted target", () => {
    // Given
    const reportStatus = vi.fn();
    const container = document.createElement("div");
    const stale = document.createElement("button");
    const current = document.createElement("button");
    container.append(stale, current);
    document.body.append(container);
    Object.defineProperty(container, "scrollBy", { value: vi.fn() });
    const registry = createLearningFocusRegistry({
      prefersReducedMotion: () => false,
      reportStatus,
    });
    const target = {
      kind: "section",
      routeId: rootRoute,
      sectionId: "embedding",
    } as const;
    const unregisterStale = registry.register(target, stale, container);
    registry.register(target, current, container);
    unregisterStale();
    current.remove();

    // When
    const revealed = registry.reveal(target, { focus: false });

    // Then
    expect(revealed).toBe(false);
    expect(reportStatus).toHaveBeenLastCalledWith({
      availability: "unavailable",
    });

    container.remove();
  });
});
