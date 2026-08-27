import { type ReactElement, useLayoutEffect, useMemo, useRef } from "react";

import { useFocusedViewer } from "../../../overlays/focusedViewerStore";
import { LearningGuide } from "../../LearningGuide";
import { LearningWorkspace } from "../../LearningWorkspace";
import type {
  ArchitectureRenderContext,
  LearningCourseLocation,
  LearningTrackProfile,
} from "../../types";
import { DecoderLearningWorkspace } from "../DecoderLearningWorkspace";
import { decoderRoute, decoderRouteId } from "../routes";
import { CurriculumChapterFooter } from "./CurriculumChapterFooter";
import { CurriculumChapterHeader } from "./CurriculumChapterHeader";
import { decoderCurriculum } from "./catalog";
import { createCourseArchitectureContext } from "./courseArchitectureNavigation";
import type {
  CurriculumRendererRegistry,
  RenderableCurriculum,
} from "./curriculumRendererRegistry";
import {
  type CurriculumFocusEvent,
  createCurriculumFocusHandoff,
} from "./curriculumState";
import {
  type CurriculumViewerContext,
  createCurriculumViewerRequest,
  createCurriculumVisualizationViewer,
  curriculumDiagramActionLabel,
} from "./focusedViewerRequests";
import {
  chapterNavigation,
  destinationForChapter,
  incumbentGuideDestination,
  isChapterId,
  transitionToCurriculumRoute,
  useGeneratedTokenFocus,
} from "./navigation";
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
  const { openViewer } = useFocusedViewer();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const previousChapterRef = useRef<ChapterId | null>(null);
  useGeneratedTokenFocus(workspaceRef, context.state.selectedNodeId);
  const routeId = decoderRouteId(decoderRoute(context.state));
  const learningContext = createCourseArchitectureContext(context, course);
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
  const diagramId = concept?.diagramId;
  const viewerContext: CurriculumViewerContext | null =
    Diagram === undefined ||
    diagramId === undefined ||
    page === undefined ||
    chapter === undefined
      ? null
      : {
          chapterId,
          title: chapter.title,
          learningGoal: page.learningGoal,
          pageId: page.id,
          trackId: course.trackId,
          diagramId,
          Diagram,
          profile,
        };
  const diagramRequest =
    viewerContext === null
      ? null
      : createCurriculumViewerRequest(viewerContext);
  const visualization =
    visualizationId === undefined
      ? undefined
      : createCurriculumVisualizationViewer({
          chapterId,
          title: chapter?.title ?? "Chapter",
          visualizationId,
          layer: context.state.selectedLayer,
          head: context.state.selectedHead,
        });
  const content =
    page === undefined ||
    Diagram === undefined ||
    diagramId === undefined ||
    viewerContext === null ||
    diagramRequest === null ||
    registry === undefined ? (
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
          actionLabel: curriculumDiagramActionLabel(
            chapter?.title ?? page.title,
            diagramId,
          ),
          request: diagramRequest,
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
              onSectionFocus={(section) =>
                openViewer(
                  createCurriculumViewerRequest(viewerContext, section),
                )
              }
            />
          ),
        }}
        {...(visualization === undefined ? {} : { visualization })}
      />
    );

  return (
    <section
      ref={workspaceRef}
      className="curriculum-workspace"
      data-curriculum-chapter-id={chapterId}
      data-learning-layout="article"
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
      <CurriculumChapterFooter
        previous={navigation?.previous}
        next={navigation?.next}
        onNavigate={course.navigateChapter}
      />
    </section>
  );
}
