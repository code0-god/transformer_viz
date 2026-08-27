import type { ArchitectureAction } from "../../../architecture";
import { CHAPTER_IDS } from "./ids";
import type { ChapterId } from "./types";

function chapterForArchitectureAction(
  action: ArchitectureAction,
): ChapterId | undefined {
  if (action.type === "activate-node") {
    if (action.nodeId === "transformer-block") return CHAPTER_IDS[12];
    if (action.nodeId === "self-attention") return CHAPTER_IDS[13];
    return undefined;
  }
  if (action.type !== "navigate-breadcrumb") return undefined;
  switch (action.view) {
    case "root":
      return CHAPTER_IDS[11];
    case "transformer-block":
      return CHAPTER_IDS[12];
    case "self-attention":
      return CHAPTER_IDS[13];
  }
}

export function navigateCourseArchitecture(
  action: ArchitectureAction,
  navigateChapter: (chapterId: string) => void,
  navigateArchitecture: (action: ArchitectureAction) => void,
): void {
  const chapterId = chapterForArchitectureAction(action);
  if (chapterId === undefined) navigateArchitecture(action);
  else navigateChapter(chapterId);
}
