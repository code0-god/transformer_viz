export type CurriculumDestination = {
  readonly routeId: "decoder.root" | "decoder.block" | "decoder.self-attention";
  readonly sectionId: string;
  readonly nodeId: string;
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
