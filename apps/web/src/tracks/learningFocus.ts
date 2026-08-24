import type { LearningNodeId, LearningRouteId } from "./workspaceTypes";

export type LearningFocusOrigin = "diagram" | "guide" | "route";

export type LearningFocusState = {
  readonly routeId: LearningRouteId;
  readonly activeSectionId: string | null;
  readonly highlightedNodeIds: readonly LearningNodeId[];
  readonly origin: LearningFocusOrigin;
};

type LearningFocusActivation = {
  readonly origin: Exclude<LearningFocusOrigin, "route">;
  readonly routeId: LearningRouteId;
  readonly sectionId: string;
  readonly highlightedNodeIds: readonly LearningNodeId[];
};

export type LearningFocusTarget =
  | {
      readonly kind: "section";
      readonly routeId: LearningRouteId;
      readonly sectionId: string;
    }
  | {
      readonly kind: "node";
      readonly routeId: LearningRouteId;
      readonly nodeId: LearningNodeId;
    };

export type LearningFocusStatus = {
  readonly availability: "available" | "unavailable";
};

type LearningFocusRegistryOptions = {
  readonly prefersReducedMotion: () => boolean;
  readonly reportStatus: (status: LearningFocusStatus) => void;
};

type RevealOptions = {
  readonly focus: boolean;
};

type RegisteredTarget = {
  readonly element: HTMLElement | SVGElement;
  readonly container: HTMLElement;
};

type ScrollOffset = {
  readonly top: number;
  readonly left: number;
};

export type LearningFocusRegistry = {
  readonly register: (
    target: LearningFocusTarget,
    element: HTMLElement | SVGElement,
    container: HTMLElement,
  ) => () => void;
  readonly reveal: (
    target: LearningFocusTarget,
    options: RevealOptions,
  ) => boolean;
};

export function createLearningFocusState(
  routeId: LearningRouteId,
): LearningFocusState {
  return {
    routeId,
    activeSectionId: null,
    highlightedNodeIds: [],
    origin: "route",
  };
}

export function activateLearningFocus(
  state: LearningFocusState,
  activation: LearningFocusActivation,
): LearningFocusState {
  if (state.routeId !== activation.routeId) return state;
  return {
    routeId: state.routeId,
    activeSectionId: activation.sectionId,
    highlightedNodeIds: activation.highlightedNodeIds,
    origin: activation.origin,
  };
}

export function synchronizeLearningRoute(
  state: LearningFocusState,
  routeId: LearningRouteId,
): LearningFocusState {
  return state.routeId === routeId ? state : createLearningFocusState(routeId);
}

function targetKey(target: LearningFocusTarget): string {
  switch (target.kind) {
    case "section":
      return `${target.routeId}:section:${target.sectionId}`;
    case "node":
      return `${target.routeId}:node:${target.nodeId}`;
  }
}

function nearestEdgeOffset(
  viewport: DOMRectReadOnly,
  target: DOMRectReadOnly,
): ScrollOffset {
  const top =
    target.top < viewport.top
      ? target.top - viewport.top
      : target.bottom > viewport.bottom
        ? target.bottom - viewport.bottom
        : 0;
  const left =
    target.left < viewport.left
      ? target.left - viewport.left
      : target.right > viewport.right
        ? target.right - viewport.right
        : 0;
  return { top, left };
}

export function createLearningFocusRegistry(
  options: LearningFocusRegistryOptions,
): LearningFocusRegistry {
  // This map is the registry's mutable store; registration lifetimes own its entries.
  const targets = new Map<string, RegisteredTarget>();

  return {
    register: (target, element, container) => {
      const key = targetKey(target);
      const registration = { element, container };
      targets.set(key, registration);
      return () => {
        if (targets.get(key) === registration) targets.delete(key);
      };
    },
    reveal: (target, revealOptions) => {
      const key = targetKey(target);
      const registration = targets.get(key);
      if (registration === undefined || !registration.element.isConnected) {
        targets.delete(key);
        options.reportStatus({ availability: "unavailable" });
        return false;
      }

      if (revealOptions.focus) {
        registration.element.focus({ preventScroll: true });
      }
      const offset = nearestEdgeOffset(
        registration.container.getBoundingClientRect(),
        registration.element.getBoundingClientRect(),
      );
      if (offset.top !== 0 || offset.left !== 0) {
        registration.container.scrollBy({
          ...offset,
          behavior: options.prefersReducedMotion() ? "auto" : "smooth",
        });
      }
      options.reportStatus({ availability: "available" });
      return true;
    },
  };
}
