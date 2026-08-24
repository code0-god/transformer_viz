import {
  type ReactElement,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ArchitectureLearningProvider } from "../../architecture/ArchitectureLearningContext";
import {
  type ArchitectureNodeId,
  architectureNodeCatalog,
} from "../../architecture/catalog";
import type { ArchitectureView } from "../../architecture/state";
import { LearningWorkspace } from "../LearningWorkspace";
import {
  activateLearningFocus,
  createLearningFocusRegistry,
  createLearningFocusState,
  type LearningFocusStatus,
  synchronizeLearningRoute,
} from "../learningFocus";
import type {
  ArchitectureRenderContext,
  LearningGuideSection,
  LearningTrackProfile,
} from "../types";
import { DecoderDiagram } from "./DecoderDiagram";
import { DecoderGuide } from "./DecoderGuide";
import { DecoderRouteControls } from "./DecoderRouteControls";
import {
  guideSectionForNode,
  guideSectionHighlights,
} from "./decoderWorkspaceSections";
import { decoderGuidePage } from "./guide";
import { decoderLearningNodeByArchitecture } from "./nodes";
import { decoderRoute, decoderRouteId } from "./routes";

type DecoderLearningWorkspaceProps = {
  readonly context: ArchitectureRenderContext;
  readonly profile: LearningTrackProfile;
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
}: DecoderLearningWorkspaceProps): ReactElement {
  const routeId = decoderRouteId(decoderRoute(context.state));
  const route = profile.routes.definitions.find(({ id }) => id === routeId);
  if (route === undefined) throw new DecoderWorkspaceError(routeId);
  const page = decoderGuidePage(routeId);
  const [focus, setFocus] = useState(() => createLearningFocusState(routeId));
  const [status, setStatus] = useState<LearningFocusStatus>({
    availability: "available",
  });
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const previousRouteRef = useRef(routeId);
  const nodeCleanups = useRef(new Map<ArchitectureNodeId, () => void>());
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

  const registerNode = useCallback(
    (nodeId: ArchitectureNodeId, element: SVGGElement | null) => {
      nodeCleanups.current.get(nodeId)?.();
      nodeCleanups.current.delete(nodeId);
      const learningNodeId = decoderLearningNodeByArchitecture[nodeId];
      const container = element?.ownerSVGElement?.parentElement;
      if (
        learningNodeId === undefined ||
        element === null ||
        !(container instanceof HTMLElement)
      )
        return;
      nodeCleanups.current.set(
        nodeId,
        registry.register(
          { kind: "node", routeId, nodeId: learningNodeId },
          element,
          container,
        ),
      );
    },
    [registry, routeId],
  );

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
    context.navigate({
      type: "navigate-breadcrumb",
      view,
      layerCount: context.model.config.n_layer,
    });
  };
  const selectLayer = (layer: number): void => {
    context.navigate({
      type: "select-layer",
      layer,
      layerCount: context.model.config.n_layer,
    });
  };
  const selectHead = (head: number): void => {
    context.navigate({
      type: "select-head",
      head,
      headCount: context.model.config.n_head,
    });
  };
  const activateDiagram = (nodeId: ArchitectureNodeId): void => {
    context.navigate({
      type: "activate-node",
      nodeId,
      layerCount: context.model.config.n_layer,
      headCount: context.model.config.n_head,
    });
    if (architectureNodeCatalog[nodeId].capability === "drill-down") return;
    const learningNodeId = decoderLearningNodeByArchitecture[nodeId];
    if (learningNodeId === undefined) return;
    const section = guideSectionForNode(page, learningNodeId);
    if (section === undefined) return;
    setFocus((previous) =>
      activateLearningFocus(synchronizeLearningRoute(previous, routeId), {
        origin: "diagram",
        routeId,
        sectionId: section.id,
        highlightedNodeIds: [],
      }),
    );
    registry.reveal(
      { kind: "section", routeId, sectionId: section.id },
      { focus: true },
    );
  };
  const focusDiagram = (section: LearningGuideSection): void => {
    if (section.primaryNodeId === undefined) return;
    setFocus((previous) =>
      activateLearningFocus(synchronizeLearningRoute(previous, routeId), {
        origin: "guide",
        routeId,
        sectionId: section.id,
        highlightedNodeIds: guideSectionHighlights(section),
      }),
    );
    registry.reveal(
      { kind: "node", routeId, nodeId: section.primaryNodeId },
      { focus: true },
    );
  };

  const highlightedNodeIds = currentFocus.highlightedNodeIds.flatMap(
    (learningNodeId) => {
      const nodeId = profile.architecture.nodeMap[learningNodeId];
      return nodeId === undefined ? [] : [nodeId];
    },
  );
  const selectedLearningNodeId =
    context.state.selectedNodeId === null
      ? undefined
      : decoderLearningNodeByArchitecture[context.state.selectedNodeId];
  return (
    <LearningWorkspace
      route={route}
      status={status}
      onRouteTitleRef={(element) => {
        titleRef.current = element;
      }}
      headerControls={
        <DecoderRouteControls
          context={context}
          navigateRoot={() => navigateTo("root")}
          navigateBlock={() => navigateTo("transformer-block")}
          selectLayer={selectLayer}
          selectHead={selectHead}
        />
      }
      diagram={{
        label: `${route.title} Diagram`,
        content: (
          <ArchitectureLearningProvider registerNode={registerNode}>
            <DecoderDiagram
              context={context}
              highlightedNodeIds={highlightedNodeIds}
              activateNode={activateDiagram}
              navigateTo={navigateTo}
              selectLayer={selectLayer}
              selectHead={selectHead}
            />
          </ArchitectureLearningProvider>
        ),
      }}
      guide={{
        label: `${route.title} Guide`,
        content: (
          <DecoderGuide
            context={context}
            profile={profile}
            page={page}
            activeSectionId={currentFocus.activeSectionId}
            selectedNodeId={selectedLearningNodeId}
            onSectionFocus={focusDiagram}
            onSectionRef={registerSection}
            navigateTo={navigateTo}
          />
        ),
      }}
    />
  );
}
