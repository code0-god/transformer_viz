import type { LearningGuidePage } from "../../guideTypes";
import { methodsChapterContent } from "./content/part0/methods";
import { nlpChapterContent } from "./content/part0/nlp";
import { tokenChapterContent } from "./content/part0/token";
import { vocabularyChapterContent } from "./content/part0/vocabulary";
import { GUIDE_PAGE_IDS } from "./ids";
import type { GuidePageId } from "./types";

export const part0GuidePages = [
  nlpChapterContent.page,
  tokenChapterContent.page,
  vocabularyChapterContent.page,
  methodsChapterContent.page,
] as const satisfies readonly LearningGuidePage<string>[];

const part0GuidePageById: Readonly<Record<string, LearningGuidePage<string>>> =
  Object.fromEntries(part0GuidePages.map((page) => [page.id, page]));

export function curriculumGuidePage(
  pageId: GuidePageId,
): LearningGuidePage<string> | undefined {
  return part0GuidePageById[pageId];
}

export const curriculumGuidePages = GUIDE_PAGE_IDS.map((id) => {
  const page = curriculumGuidePage(id);
  return (
    page ?? {
      id,
      routeId: "decoder.root",
      title: id,
      learningGoal: "",
      introduction: [],
      sections: [{ id: `${id}.section`, title: id, blocks: [] }],
      keyTakeaway: [],
      glossary: [],
    }
  );
});
