import type { ChapterId } from "./types";

export type CurriculumDestination = {
  readonly routeId: "decoder.root" | "decoder.block" | "decoder.self-attention";
  readonly sectionId: string;
  readonly nodeId: string;
};

export type CurriculumState = {
  readonly chapterId: ChapterId;
  readonly isActive: boolean;
  readonly pending: CurriculumDestination | null;
};

export type DestinationRegistration = CurriculumDestination & {
  readonly element: HTMLElement;
};

export type CurriculumFocusEvent =
  | "subscribe"
  | "transition"
  | "matching register"
  | "reveal"
  | "focus";

export type CurriculumFocusHandoff = {
  readonly navigate: (
    destination: CurriculumDestination,
    transition: () => void,
  ) => void;
  readonly register: (registration: DestinationRegistration) => void;
  readonly pending: () => CurriculumDestination | null;
};

export const initialCurriculumState: CurriculumState = {
  chapterId: "decoder.chapter.0.1",
  isActive: false,
  pending: null,
};

function matchesDestination(
  destination: CurriculumDestination,
  registration: DestinationRegistration,
): boolean {
  return (
    destination.routeId === registration.routeId &&
    destination.sectionId === registration.sectionId &&
    destination.nodeId === registration.nodeId
  );
}

export function selectCurriculumChapter(
  state: CurriculumState,
  chapterId: ChapterId,
): CurriculumState {
  return { ...state, chapterId, isActive: true };
}

export function beginCurriculumNavigation(
  state: CurriculumState,
  chapterId: ChapterId,
  destination: CurriculumDestination,
): CurriculumState {
  return {
    ...selectCurriculumChapter(state, chapterId),
    pending: destination,
  };
}

export function consumeDestinationRegistration(
  state: CurriculumState,
  registration: DestinationRegistration,
): CurriculumState {
  if (
    state.pending === null ||
    !matchesDestination(state.pending, registration)
  ) {
    return state;
  }
  registration.element.focus({ preventScroll: true });
  return { ...state, pending: null };
}

export function createCurriculumFocusHandoff(
  onEvent: (event: CurriculumFocusEvent) => void,
): CurriculumFocusHandoff {
  let pending: CurriculumDestination | null = null;
  return {
    navigate: (destination, transition) => {
      pending = destination;
      onEvent("subscribe");
      onEvent("transition");
      transition();
    },
    register: (registration) => {
      if (pending === null || !matchesDestination(pending, registration))
        return;
      pending = null;
      onEvent("matching register");
      onEvent("reveal");
      registration.element.focus({ preventScroll: true });
      onEvent("focus");
    },
    pending: () => pending,
  };
}
