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
  const navigation = chapterNavigation(chapterId);
  if (navigation === undefined) {
    return {
      routeId: "decoder.root",
      sectionId: "root-context",
      nodeId: "decoder.root.input-context",
    };
  }
  if (chapterId === "decoder.chapter.4.1") {
    return {
      routeId: "decoder.block",
      sectionId: "block-overview",
      nodeId: "decoder.root.transformer-block",
    };
  }
  if (chapterId === "decoder.chapter.5.1") {
    return {
      routeId: "decoder.self-attention",
      sectionId: "qkv",
      nodeId: "decoder.attention.qkv-projection",
    };
  }
  const concept = navigation.current.concepts[0];
  return {
    routeId: "decoder.root",
    sectionId:
      chapterId === "decoder.chapter.3.1"
        ? "root-context"
        : (concept?.guideSectionIds[0] ?? "root-context"),
    nodeId: concept?.relatedNodeIds[0] ?? "decoder.root.input-context",
  };
}
