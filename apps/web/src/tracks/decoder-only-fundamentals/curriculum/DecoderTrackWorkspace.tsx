import {
  type ComponentType,
  type ReactElement,
  type Ref,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ArchitectureView } from "../../../architecture/state";
import type { FormulaDefinition } from "../../../math/formulaCatalog";
import { LearningGuide } from "../../LearningGuide";
import { LearningWorkspace } from "../../LearningWorkspace";
import type {
  ArchitectureRenderContext,
  GlossaryEntry,
  LearningGuidePage,
  LearningTrackProfile,
  RuntimeFactsPresentation,
} from "../../types";
import { DecoderLearningWorkspace } from "../DecoderLearningWorkspace";
import { decoderRoute, decoderRouteId } from "../routes";
import { CurriculumNavigation } from "./CurriculumNavigation";
import { decoderCurriculum } from "./catalog";
import {
  beginCurriculumNavigation,
  type CurriculumFocusEvent,
  createCurriculumFocusHandoff,
  initialCurriculumState,
  selectCurriculumChapter,
} from "./curriculumState";
import { chapterNavigation, destinationForChapter } from "./navigation";
import { initialLearningPaneState } from "./paneMode";
import type {
  ChapterId,
  DiagramId,
  GuidePageId,
  LearningCurriculum,
} from "./types";
import "./curriculum.css";

export type CurriculumDiagramRendererProps = {
  readonly focusButtonRef: Ref<HTMLButtonElement>;
  readonly onFocusGuide: () => void;
};

export type CurriculumRendererRegistry = {
  readonly resolveGuidePage: (
    pageId: GuidePageId,
  ) => LearningGuidePage<string> | undefined;
  readonly resolveDiagram: (
    diagramId: DiagramId,
  ) => ComponentType<CurriculumDiagramRendererProps> | undefined;
  readonly glossary: readonly GlossaryEntry[];
  readonly formulas: Readonly<Record<string, FormulaDefinition<string>>>;
  readonly runtimeFacts: Readonly<Record<string, RuntimeFactsPresentation>>;
};

export type RenderableCurriculum = LearningCurriculum & {
  readonly rendererRegistry?: CurriculumRendererRegistry;
};

type DecoderTrackWorkspaceProps = {
  readonly context: ArchitectureRenderContext;
  readonly profile: LearningTrackProfile;
  readonly rendererRegistry?: CurriculumRendererRegistry;
};

export function DecoderTrackWorkspace({
  context,
  profile,
  rendererRegistry,
}: DecoderTrackWorkspaceProps): ReactElement {
  const [curriculumState, setCurriculumState] = useState(
    initialCurriculumState,
  );
  const { chapterId, isActive } = curriculumState;
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const diagramFocusRef = useRef<HTMLButtonElement | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const focusInPlaceRef = useRef(false);
  const routeId = decoderRouteId(decoderRoute(context.state));
  const navigation = chapterNavigation(chapterId);
  const chapter = navigation?.current;
  const concept = chapter?.concepts[0];
  const curriculum: RenderableCurriculum = decoderCurriculum;
  const registry = rendererRegistry ?? curriculum.rendererRegistry;
  const page =
    registry === undefined || concept?.guidePageId === undefined
      ? undefined
      : registry.resolveGuidePage(concept.guidePageId);
  const Diagram =
    registry === undefined || concept === undefined
      ? undefined
      : registry.resolveDiagram(concept.diagramId);
  const part = curriculum.parts.find(({ id }) => id === chapter?.partId);
  const handoff = useMemo(
    () =>
      createCurriculumFocusHandoff((event: CurriculumFocusEvent) => {
        window.dispatchEvent(
          new CustomEvent("curriculum-focus", { detail: event }),
        );
      }),
    [],
  );

  useLayoutEffect(() => {
    const heading = headingRef.current;
    if (heading === null) return;
    if (isActive && focusInPlaceRef.current) {
      focusInPlaceRef.current = false;
      heading.focus({ preventScroll: true });
    }
    const destination = destinationForChapter(chapterId);
    if (destination.routeId !== routeId) return;
    handoff.register({ ...destination, element: heading });
    setCurriculumState((current) => {
      const pending = current.pending;
      if (
        pending === null ||
        pending.routeId !== destination.routeId ||
        pending.sectionId !== destination.sectionId ||
        pending.nodeId !== destination.nodeId
      ) {
        return current;
      }
      return { ...current, pending: null };
    });
  }, [chapterId, handoff, isActive, routeId]);

  const transitionTo = (view: ArchitectureView): void => {
    switch (view) {
      case "root":
        context.navigate({
          type: "navigate-breadcrumb",
          view,
          layerCount: context.model.config.n_layer,
        });
        return;
      case "transformer-block":
        context.navigate({
          type: "navigate-breadcrumb",
          view,
          layerCount: context.model.config.n_layer,
        });
        return;
      case "self-attention":
        context.navigate({
          type: "activate-node",
          nodeId: "self-attention",
          layerCount: context.model.config.n_layer,
          headCount: context.model.config.n_head,
        });
        return;
    }
  };

  const navigateChapter = (nextChapterId: ChapterId): void => {
    const destination = destinationForChapter(nextChapterId);
    if (destination.routeId === routeId) {
      focusInPlaceRef.current = true;
      setCurriculumState((current) =>
        selectCurriculumChapter(current, nextChapterId),
      );
      return;
    }
    handoff.navigate(destination, () => {
      setCurriculumState((current) =>
        beginCurriculumNavigation(current, nextChapterId, destination),
      );
      switch (destination.routeId) {
        case "decoder.root":
          transitionTo("root");
          return;
        case "decoder.block":
          transitionTo("transformer-block");
          return;
        case "decoder.self-attention":
          transitionTo("self-attention");
          return;
      }
    });
  };

  const content =
    !isActive ||
    page === undefined ||
    Diagram === undefined ||
    registry === undefined ? (
      <DecoderLearningWorkspace context={context} profile={profile} />
    ) : (
      <LearningWorkspace
        route={{
          id: page.routeId,
          title: part?.title ?? "Curriculum",
          subtitle: chapter?.title ?? page.title,
        }}
        status={{ availability: "available" }}
        diagram={{
          label: `${chapter?.title ?? page.title} Diagram`,
          content: (
            <Diagram
              focusButtonRef={diagramFocusRef}
              onFocusGuide={() => {
                const introduction = workspaceRef.current?.querySelector(
                  "[data-testid='guide-introduction']",
                );
                if (!(introduction instanceof HTMLElement)) return;
                introduction.tabIndex = -1;
                introduction.focus({ preventScroll: true });
              }}
            />
          ),
        }}
        guide={{
          label: `${chapter?.title ?? page.title} Guide`,
          content: (
            <LearningGuide
              page={page}
              glossary={registry.glossary}
              formulas={registry.formulas}
              runtimeFacts={registry.runtimeFacts}
              onSectionFocus={() => {
                diagramFocusRef.current?.focus({ preventScroll: true });
              }}
            />
          ),
        }}
      />
    );

  return (
    <section
      ref={workspaceRef}
      className="curriculum-workspace"
      data-curriculum-chapter-id={chapterId}
      data-pane-mode={initialLearningPaneState.mode}
    >
      <header className="curriculum-workspace__header">
        <div className="curriculum-workspace__chapter-copy">
          <h1 ref={headingRef} tabIndex={-1}>
            {chapter?.title ?? "Curriculum"}
          </h1>
          <p>{chapter?.concepts[0]?.title ?? "Decoder-only fundamentals"}</p>
        </div>
        <CurriculumNavigation
          currentChapterId={chapterId}
          onNavigate={navigateChapter}
        />
      </header>
      {content}
    </section>
  );
}
