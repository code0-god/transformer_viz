import { type RefObject, useLayoutEffect } from "react";

import type {
  ArchitectureAction,
  ArchitectureNodeId,
} from "../../../architecture";
import { decoderCurriculum } from "./catalog";
import type { CurriculumDestination } from "./curriculumState";
import type { ChapterId, LearningChapter } from "./types";

export const curriculumChapters: readonly LearningChapter[] =
  decoderCurriculum.parts.flatMap(({ chapters }) => chapters);

export type ChapterNavigation = {
  readonly current: LearningChapter;
  readonly index: number;
  readonly previous?: LearningChapter;
  readonly next?: LearningChapter;
};

type IncumbentGuideDestination = CurriculumDestination & {
  readonly pageId:
    | "decoder-guide-root"
    | "decoder-guide-block"
    | "decoder-guide-self-attention";
};

const INCUMBENT_GUIDE_DESTINATIONS: Readonly<
  Partial<Record<ChapterId, IncumbentGuideDestination>>
> = {
  "decoder.chapter.3.1": {
    routeId: "decoder.root",
    pageId: "decoder-guide-root",
    sectionId: "root-generation-overview",
    nodeId: "decoder.root.architecture",
  },
  "decoder.chapter.4.1": {
    routeId: "decoder.block",
    pageId: "decoder-guide-block",
    sectionId: "block-overview",
    nodeId: "decoder.root.transformer-block",
  },
  "decoder.chapter.5.1": {
    routeId: "decoder.self-attention",
    pageId: "decoder-guide-self-attention",
    sectionId: "qkv",
    nodeId: "decoder.attention.qkv-projection",
  },
};

export function incumbentGuideDestination(
  chapterId: ChapterId,
): IncumbentGuideDestination | undefined {
  return INCUMBENT_GUIDE_DESTINATIONS[chapterId];
}

export function transitionToCurriculumRoute(
  routeId: CurriculumDestination["routeId"],
  navigate: (action: ArchitectureAction) => void,
  layerCount: number,
  headCount: number,
): void {
  switch (routeId) {
    case "decoder.root":
      navigate({ type: "navigate-breadcrumb", view: "root", layerCount });
      return;
    case "decoder.block":
      navigate({
        type: "navigate-breadcrumb",
        view: "transformer-block",
        layerCount,
      });
      return;
    case "decoder.self-attention":
      navigate({
        type: "activate-node",
        nodeId: "self-attention",
        layerCount,
        headCount,
      });
      return;
  }
}

export function useGeneratedTokenFocus(
  workspaceRef: RefObject<HTMLElement | null>,
  selectedNodeId: ArchitectureNodeId | null,
): void {
  useLayoutEffect(() => {
    const workspace = workspaceRef.current;
    if (workspace === null || selectedNodeId !== "generated-token") return;
    const preserveGeneratedTokenFocus = (event: MouseEvent): void => {
      const target = event.target;
      if (
        !(target instanceof Element) ||
        target.closest(
          "[data-guide-section-id='root-append-repeat'] .learning-guide-section-control",
        ) === null
      )
        return;
      queueMicrotask(() => {
        const generatedToken = workspace.querySelector(
          "[data-node-id='generated-token']",
        );
        if (generatedToken instanceof SVGElement)
          generatedToken.focus({ preventScroll: true });
      });
    };
    workspace.addEventListener("click", preserveGeneratedTokenFocus);
    return () =>
      workspace.removeEventListener("click", preserveGeneratedTokenFocus);
  }, [selectedNodeId, workspaceRef]);
}

export function chapterNavigation(
  chapterId: string,
): ChapterNavigation | undefined {
  const index = curriculumChapters.findIndex(({ id }) => id === chapterId);
  const current = curriculumChapters[index];
  if (current === undefined) return undefined;
  const previous = curriculumChapters[index - 1];
  const next = curriculumChapters[index + 1];
  return {
    current,
    index,
    ...(previous === undefined ? {} : { previous }),
    ...(next === undefined ? {} : { next }),
  };
}

export function destinationForChapter(
  chapterId: ChapterId,
): CurriculumDestination {
  const incumbentDestination = incumbentGuideDestination(chapterId);
  if (incumbentDestination !== undefined) return incumbentDestination;
  const navigation = chapterNavigation(chapterId);
  if (navigation === undefined) {
    return {
      routeId: "decoder.root",
      sectionId: "root-context",
      nodeId: "decoder.root.input-context",
    };
  }
  const concept = navigation.current.concepts[0];
  return {
    routeId: "decoder.root",
    sectionId: concept?.guideSectionIds[0] ?? "root-context",
    nodeId: concept?.relatedNodeIds[0] ?? "decoder.root.input-context",
  };
}
