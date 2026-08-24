import type { LearningGuidePage } from "../types";
import { attentionGuideGlossary } from "./attentionGuideGlossary";
import { attentionGuideTakeaway } from "./attentionGuideMisconceptions";
import { attentionOperationSections } from "./attentionGuideOperations";
import {
  attentionGuideIntroduction,
  attentionOverviewSections,
} from "./attentionGuideOverview";

export { attentionGuideGlossary } from "./attentionGuideGlossary";

export const attentionGuide: LearningGuidePage = {
  id: "decoder-guide-self-attention",
  routeId: "decoder.self-attention",
  title: "Self-Attention",
  learningGoal:
    "Causal Self-Attention이 Q/K/V를 만들고, 과거와 현재 위치만 사용해 Value를 섞는 순서를 설명합니다.",
  introduction: attentionGuideIntroduction,
  sections: [...attentionOverviewSections, ...attentionOperationSections],
  outlineSectionIds: [
    "qkv",
    "heads",
    "score",
    "scale",
    "mask",
    "softmax",
    "value",
    "merge",
  ],
  keyTakeaway: attentionGuideTakeaway,
  glossary: attentionGuideGlossary.map(({ id }) => id),
};
