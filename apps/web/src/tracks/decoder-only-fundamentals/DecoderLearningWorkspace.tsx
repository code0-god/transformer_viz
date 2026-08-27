import {
  type ReactElement,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ArchitectureView } from "../../architecture/state";
import { useFocusedViewer } from "../../overlays/focusedViewerStore";
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
import { DecoderGuide } from "./DecoderGuide";
import { guideSectionHighlights } from "./decoderWorkspaceSections";
import { decoderGuidePage } from "./guide";
import { decoderLearningNodeByArchitecture } from "./nodes";
import { decoderRoute, decoderRouteId } from "./routes";

type DecoderLearningWorkspaceProps = {
  readonly context: ArchitectureRenderContext;
  readonly profile: LearningTrackProfile;
  readonly presentation?: "route" | "chapter";
  readonly visualizationId?: string;
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
  visualizationId,
}: DecoderLearningWorkspaceProps): ReactElement {
  const routeId = decoderRouteId(decoderRoute(context.state));
  const route = profile.routes.definitions.find(({ id }) => id === routeId);
  if (route === undefined) throw new DecoderWorkspaceError(routeId);
  const page = decoderGuidePage(routeId);
  const [focus, setFocus] = useState(() => createLearningFocusState(routeId));
  const [status, setStatus] = useState<LearningFocusStatus>({
    availability: "available",
  });
  const { openViewer } = useFocusedViewer();
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

  const focusDiagram = (section: LearningGuideSection): void => {
    if (section.primaryNodeId === undefined) return;
    const sectionHighlights = guideSectionHighlights(section);
    setFocus((previous) =>
      activateLearningFocus(synchronizeLearningRoute(previous, routeId), {
        origin: "guide",
        routeId,
        sectionId: section.id,
        highlightedNodeIds: sectionHighlights,
      }),
    );
    setStatus({ availability: "available" });
    openViewer({
      id: `${routeId}:architecture:${section.id}`,
      kind: "architecture",
      source: "learn",
      title: `${route.title} 전체 구조`,
      description: section.title,
      view: context.state.view,
      conceptId: section.id,
      articleTargetId: `${page.id}-${section.id}-title`,
      highlightedNodeIds: sectionHighlights.flatMap((learningNodeId) => {
        const nodeId = profile.architecture.nodeMap[learningNodeId];
        return nodeId === undefined ? [] : [nodeId];
      }),
    });
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
      presentation={presentation}
      onRouteTitleRef={(element) => {
        titleRef.current = element;
      }}
      diagram={{
        label: `${route.title} Diagram`,
        actionLabel:
          context.state.view === "root"
            ? "GPT 전체 구조 보기"
            : context.state.view === "transformer-block"
              ? "Transformer Block 내부 보기"
              : "Self-Attention 계산 흐름 보기",
        request: {
          id: `${routeId}:architecture`,
          kind: "architecture",
          source: "learn",
          title: `${route.title} 전체 구조`,
          description: route.subtitle,
          view: context.state.view,
          highlightedNodeIds,
        },
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
      {...(visualizationId === undefined
        ? {}
        : {
            visualization: {
              label: `${route.title} Visualization`,
              actionLabel: "실제 Score Matrix 확인하기",
              request: {
                id: `${routeId}:visualization:${visualizationId}`,
                kind: "visualization",
                source: "learn",
                title: "Attention Score Matrix",
                description:
                  "선택한 generation step의 실제 Query·Key 내적 점수입니다.",
                visualizationId,
                layer: context.state.selectedLayer,
                head: context.state.selectedHead,
              },
            },
          })}
    />
  );
}
