import {
  type ComponentType,
  type ReactElement,
  type Ref,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import type { ArchitectureAction } from "../../../architecture";
import type { FormulaDefinition } from "../../../math/formulaCatalog";
import { LearningGuide } from "../../LearningGuide";
import { LearningWorkspace } from "../../LearningWorkspace";
import type {
  ArchitectureRenderContext,
  GlossaryEntry,
  LearningCourseLocation,
  LearningGuidePage,
  LearningTrackProfile,
  RuntimeFactsPresentation,
} from "../../types";
import { DecoderLearningWorkspace } from "../DecoderLearningWorkspace";
import { decoderRoute, decoderRouteId } from "../routes";
import { CurriculumNavigation } from "./CurriculumNavigation";
import { decoderCurriculum } from "./catalog";
import { navigateCourseArchitecture } from "./courseArchitectureNavigation";
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
  const diagramFocusRef = useRef<HTMLButtonElement | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const previousChapterRef = useRef<ChapterId | null>(null);
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

  const content =
    page === undefined || Diagram === undefined || registry === undefined ? (
      <DecoderLearningWorkspace context={learningContext} profile={profile} />
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
              presentation="chapter"
              labelledBy="curriculum-chapter-title"
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
          <p className="curriculum-workspace__eyebrow">
            Part {part?.order ?? 0} · {(navigation?.index ?? 0) + 1} / 14
          </p>
          <h1 id="curriculum-chapter-title" ref={headingRef} tabIndex={-1}>
            {chapter?.title ?? "Curriculum"}
          </h1>
          <p>{page?.learningGoal ?? "Decoder-only fundamentals"}</p>
        </div>
        <CurriculumNavigation
          currentChapterId={chapterId}
          onNavigate={course.navigateChapter}
          homeHref={course.homeHref}
          chapterHref={(nextChapterId) => course.chapterHref(nextChapterId)}
        />
      </header>
      {content}
    </section>
  );
}
