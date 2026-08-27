import {
  type ReactElement,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ArchitectureAction } from "../../../architecture";
import { LearningGuide } from "../../LearningGuide";
import { LearningWorkspace } from "../../LearningWorkspace";
import type {
  ArchitectureRenderContext,
  LearningCourseLocation,
  LearningTrackProfile,
} from "../../types";
import { ScoreMatrixVisualizationPane } from "../../visualization/ScoreMatrixVisualizationPane";
import { createScoreMatrixInspectionState } from "../../visualization/scoreMatrixState";
import { DecoderLearningWorkspace } from "../DecoderLearningWorkspace";
import { decoderRoute, decoderRouteId } from "../routes";
import { CurriculumChapterHeader } from "./CurriculumChapterHeader";
import { decoderCurriculum } from "./catalog";
import { navigateCourseArchitecture } from "./courseArchitectureNavigation";
import type {
  CurriculumRendererRegistry,
  RenderableCurriculum,
} from "./curriculumRendererRegistry";
import {
  type CurriculumFocusEvent,
  createCurriculumFocusHandoff,
} from "./curriculumState";
import {
  chapterNavigation,
  destinationForChapter,
  incumbentGuideDestination,
  isChapterId,
  transitionToCurriculumRoute,
  useGeneratedTokenFocus,
} from "./navigation";
import { initialLearningPaneState, type LearningPaneMode } from "./paneMode";
import type { ChapterId } from "./types";
import "./curriculum.css";

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
  const course = context.course;
  if (
    course === undefined ||
    course.trackId !== profile.id ||
    !isChapterId(course.chapterId)
  ) {
    return <DecoderLearningWorkspace context={context} profile={profile} />;
  }
  return (
    <DecoderCurriculumWorkspace
      context={context}
      profile={profile}
      course={course}
      chapterId={course.chapterId}
      {...(rendererRegistry === undefined ? {} : { rendererRegistry })}
    />
  );
}

type DecoderCurriculumWorkspaceProps = DecoderTrackWorkspaceProps & {
  readonly course: LearningCourseLocation;
  readonly chapterId: ChapterId;
};

function DecoderCurriculumWorkspace({
  context,
  profile,
  course,
  chapterId,
  rendererRegistry,
}: DecoderCurriculumWorkspaceProps): ReactElement {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const previousChapterRef = useRef<ChapterId | null>(null);
  const [paneMode, setPaneMode] = useState<LearningPaneMode>(
    initialLearningPaneState.mode,
  );
  useGeneratedTokenFocus(workspaceRef, context.state.selectedNodeId);
  const routeId = decoderRouteId(decoderRoute(context.state));
  const navigateArchitecture = (action: ArchitectureAction): void => {
    navigateCourseArchitecture(
      action,
      course.navigateChapter,
      context.navigate,
    );
  };
  const learningContext = { ...context, navigate: navigateArchitecture };
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
    const changed = previousChapterRef.current !== chapterId;
    if (changed) {
      previousChapterRef.current = chapterId;
      setPaneMode("explanation");
    }
    const destination = destinationForChapter(chapterId);
    const incumbent = incumbentGuideDestination(chapterId);
    if (changed && destination.routeId !== routeId) {
      handoff.navigate(destination, () => {
        transitionToCurriculumRoute(
          destination.routeId,
          context.navigate,
          context.model.config.n_layer,
          context.model.config.n_head,
        );
      });
      return;
    }
    if (destination.routeId !== routeId) return;
    if (changed && incumbent !== undefined) {
      handoff.navigate(destination, () => {});
    } else if (changed) {
      heading.focus({ preventScroll: true });
    }
    const registeredElement =
      incumbent === undefined
        ? heading
        : workspaceRef.current?.querySelector(
            `[data-guide-page-id='${incumbent.pageId}'] [data-guide-section-id='${incumbent.sectionId}']`,
          );
    if (!(registeredElement instanceof HTMLElement)) return;
    handoff.register({ ...destination, element: registeredElement });
  }, [chapterId, context, handoff, routeId]);

  const visualizationId = concept?.visualizationId;
  const visualization =
    visualizationId === undefined
      ? undefined
      : {
          label: `${chapter?.title ?? "Chapter"} Visualization`,
          content: (
            <ScoreMatrixVisualizationPane
              visualizationId={visualizationId}
              state={context.scoreMatrix ?? createScoreMatrixInspectionState()}
              replayAvailable={
                context.replaySummary !== undefined &&
                context.replaySummary !== null
              }
              selectedLayer={context.state.selectedLayer}
              selectedHead={context.state.selectedHead}
              onInspect={context.inspectScoreMatrix ?? (() => undefined)}
            />
          ),
        };
  const content =
    page === undefined || Diagram === undefined || registry === undefined ? (
      <DecoderLearningWorkspace
        context={learningContext}
        profile={profile}
        presentation="chapter"
        {...(visualizationId === undefined ? {} : { visualizationId })}
      />
    ) : (
      <LearningWorkspace
        route={{
          id: page.routeId,
          title: part?.title ?? "Curriculum",
          subtitle: chapter?.title ?? page.title,
        }}
        status={{ availability: "available" }}
        presentation="chapter"
        diagram={{
          label: `${chapter?.title ?? page.title} Diagram`,
          resetKey: chapterId,
          content: <Diagram />,
        }}
        guide={{
          label: `${chapter?.title ?? page.title} Guide`,
          content: (
            <LearningGuide
              page={page}
              presentation="chapter"
              labelledBy="curriculum-chapter-title"
              glossary={registry.glossary}
              formulas={registry.formulas}
              runtimeFacts={registry.runtimeFacts}
            />
          ),
        }}
        {...(visualization === undefined
          ? {}
          : {
              visualization,
              paneMode,
              onPaneModeChange: setPaneMode,
            })}
      />
    );

  return (
    <section
      ref={workspaceRef}
      className="curriculum-workspace"
      data-curriculum-chapter-id={chapterId}
      data-pane-mode={paneMode}
    >
      <CurriculumChapterHeader
        eyebrow={`Part ${part?.order ?? 0} · ${(navigation?.index ?? 0) + 1} / 14`}
        title={chapter?.title ?? "Curriculum"}
        learningGoal={page?.learningGoal ?? "Decoder-only fundamentals"}
        chapterId={chapterId}
        course={course}
        headingRef={headingRef}
      />
      {content}
    </section>
  );
}
