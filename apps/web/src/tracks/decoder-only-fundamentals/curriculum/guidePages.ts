import type { LearningGuidePage } from "../../guideTypes";
import { methodsChapterContent } from "./content/part0/methods";
import { nlpChapterContent } from "./content/part0/nlp";
import { tokenChapterContent } from "./content/part0/token";
import { vocabularyChapterContent } from "./content/part0/vocabulary";
import { autoregressiveChapterContent } from "./content/part1/autoregressive";
import { conditionalProbabilityChapterContent } from "./content/part1/conditionalProbability";
import { definitionChapterContent } from "./content/part1/definition";
import { nextTokenChapterContent } from "./content/part1/nextToken";
import { GUIDE_PAGE_IDS } from "./ids";
import type { GuidePageId } from "./types";

export const part0GuidePages = [
  nlpChapterContent.page,
  tokenChapterContent.page,
  vocabularyChapterContent.page,
  methodsChapterContent.page,
] as const satisfies readonly LearningGuidePage<string>[];

export const part1GuidePages = [
  definitionChapterContent.page,
  nextTokenChapterContent.page,
  conditionalProbabilityChapterContent.page,
  autoregressiveChapterContent.page,
] as const satisfies readonly LearningGuidePage<string>[];

const guidePageById: Readonly<Record<string, LearningGuidePage<string>>> =
  Object.fromEntries(
    [...part0GuidePages, ...part1GuidePages].map((page) => [page.id, page]),
  );

export function curriculumGuidePage(
  pageId: GuidePageId,
): LearningGuidePage<string> | undefined {
  return guidePageById[pageId];
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
