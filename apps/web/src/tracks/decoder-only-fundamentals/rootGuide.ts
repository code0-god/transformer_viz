import type { LearningGuidePage } from "../types";
import { decoderRootFlowSections } from "./rootGuideFlowSections";
import { decoderRootReferenceSections } from "./rootGuideReferenceSections";

const sections = [
  ...decoderRootFlowSections,
  ...decoderRootReferenceSections,
] as const;

export const decoderRootGuide: LearningGuidePage = {
  id: "decoder-guide-root",
  routeId: "decoder.root",
  title: "GPT 텍스트 생성 처음부터 보기",
  learningGoal:
    "현재 context가 embedding과 Transformer Block을 거쳐 다음 token 하나를 만들고, 다시 입력으로 이어지는 과정을 설명할 수 있습니다.",
  introduction: [
    {
      id: "root-introduction",
      kind: "paragraph",
      text: "이 페이지는 입력 문자열을 숫자 표현으로 바꾸는 순간부터 다음 token을 context에 붙이는 순간까지, 한 generation step의 전체 지도를 따라갑니다. 먼저 말과 예시로 이해한 뒤 도식과 runtime 사실을 확인하고 마지막에 수식으로 정리합니다.",
    },
  ],
  sections,
  outlineSectionIds: sections.map(({ id }) => id),
  keyTakeaway: [
    {
      id: "root-key-takeaway",
      kind: "paragraph",
      text: "Autoregressive generation은 현재 context 전체에서 다음 token 하나를 예측하고, 그 token을 붙인 더 긴 context로 full forward를 반복하는 과정입니다.",
    },
  ],
  glossary: [
    "token",
    "context",
    "embedding",
    "hidden-state",
    "vocabulary",
    "logit",
    "autoregressive-generation",
  ],
  nextStep: {
    routeId: "decoder.block",
    label: "Transformer Block",
  },
};
