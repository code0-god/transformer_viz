import {
  type ReactElement,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ArchitectureView } from "../../architecture/state";
import { LearningWorkspace } from "../LearningWorkspace";
import {
  createLearningFocusRegistry,
  createLearningFocusState,
  type LearningFocusStatus,
  synchronizeLearningRoute,
} from "../learningFocus";
import type { ArchitectureRenderContext, LearningTrackProfile } from "../types";
import { DecoderGuide } from "./DecoderGuide";
import { decoderGuidePage } from "./guide";
import { createDecoderLearningFigureRegistry } from "./learningFigureRegistry";
import { decoderLearningNodeByArchitecture } from "./nodes";
import { decoderRoute, decoderRouteId } from "./routes";

type DecoderLearningWorkspaceProps = {
  readonly context: ArchitectureRenderContext;
  readonly profile: LearningTrackProfile;
  readonly presentation?: "route" | "chapter";
};

class DecoderWorkspaceError extends Error {
  constructor(readonly routeId: string) {
    super(`Decoder workspace route is missing: ${routeId}`);
    this.name = "DecoderWorkspaceError";
  }
}

export function DecoderLearningWorkspace({
  context,
  profile,
  presentation = "route",
}: DecoderLearningWorkspaceProps): ReactElement {
  const routeId = decoderRouteId(decoderRoute(context.state));
  const route = profile.routes.definitions.find(({ id }) => id === routeId);
  if (route === undefined) throw new DecoderWorkspaceError(routeId);
  const page = decoderGuidePage(routeId);
  const figures = createDecoderLearningFigureRegistry(context);
  const [focus, setFocus] = useState(() => createLearningFocusState(routeId));
  const [status, setStatus] = useState<LearningFocusStatus>({
    availability: "available",
  });
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const previousRouteRef = useRef(routeId);
  const sectionCleanups = useRef(new Map<string, () => void>());
  const registry = useMemo(
    () =>
      createLearningFocusRegistry({
        prefersReducedMotion: () =>
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        reportStatus: setStatus,
      }),
    [],
  );
  const currentFocus = synchronizeLearningRoute(focus, routeId);

  useLayoutEffect(() => {
    if (previousRouteRef.current === routeId) return;
    previousRouteRef.current = routeId;
    setFocus(createLearningFocusState(routeId));
    setStatus({ availability: "available" });
    titleRef.current?.focus();
  }, [routeId]);

  const registerSection = useCallback(
    (sectionId: string, element: HTMLElement | null) => {
      sectionCleanups.current.get(sectionId)?.();
      sectionCleanups.current.delete(sectionId);
      const container = element?.closest("#learning-guide-pane");
      if (element === null || !(container instanceof HTMLElement)) return;
      sectionCleanups.current.set(
        sectionId,
        registry.register(
          { kind: "section", routeId, sectionId },
          element,
          container,
        ),
      );
    },
    [registry, routeId],
  );

  const navigateTo = (view: ArchitectureView): void => {
    if (view === "self-attention") {
      context.navigate({
        type: "activate-node",
        nodeId: "self-attention",
        layerCount: context.model.config.n_layer,
        headCount: context.model.config.n_head,
      });
      return;
    }
    context.navigate({
      type: "navigate-breadcrumb",
      view,
      layerCount: context.model.config.n_layer,
    });
  };

  const selectedLearningNodeId =
    context.state.selectedNodeId === null
      ? undefined
      : decoderLearningNodeByArchitecture[context.state.selectedNodeId];
  return (
    <LearningWorkspace
      route={route}
      status={status}
      presentation={presentation}
      onRouteTitleRef={(element) => {
        titleRef.current = element;
      }}
      guide={{
        label: `${route.title} Guide`,
        content: (
          <DecoderGuide
            context={context}
            profile={profile}
            page={page}
            figures={figures}
            activeSectionId={currentFocus.activeSectionId}
            selectedNodeId={selectedLearningNodeId}
            onSectionRef={registerSection}
            navigateTo={navigateTo}
          />
        ),
      }}
    />
  );
}
