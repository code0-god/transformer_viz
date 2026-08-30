import type { LearningGuidePage } from "../types";
import { blockOperationSections } from "./blockGuideOperations";
import { blockClosingSections, blockOpeningSections } from "./blockGuideStudy";

const outlineSectionIds = [
  "block-overview",
  "block-input",
  "block-layer-norm-1",
  "block-self-attention",
  "block-residual-1",
  "block-layer-norm-2",
  "block-mlp",
  "block-residual-2",
  "block-attention-vs-mlp",
  "block-depth",
  "block-formulas",
  "block-misconceptions",
] as const;

export const decoderBlockGuide: LearningGuidePage = {
  id: "decoder-guide-block",
  routeId: "decoder.block",
  title: "Transformer Block",
  learningGoal:
    "Pre-LN Block이 hidden state를 attention과 MLP로 갱신하는 순서를 설명합니다.",
  introduction: [
    {
      id: "block-what-is-shown",
      kind: "paragraph",
      text: "도식은 하나의 Decoder Block 안에서 두 번의 정규화, 두 하위 연산, 두 residual 덧셈이 이어지는 흐름을 보여 줍니다.",
    },
    {
      id: "block-terms-preview",
      kind: "rich-paragraph",
      content: [
        { kind: "term-ref", termId: "hidden-state" },
        { kind: "text", text: "는 token 위치마다 여러 " },
        { kind: "term-ref", termId: "feature" },
        { kind: "text", text: "를 담고, Block 안에서 계속 갱신됩니다." },
      ],
    },
    {
      id: "figure.transformer-block",
      kind: "figure",
      figureId: "transformer-block",
      size: "full",
      caption:
        "Pre-LN Transformer Block은 Attention과 MLP를 차례로 계산하고, 각 결과를 residual stream에 더합니다.",
      alt: "Pre-LN main path와 두 residual bypass가 Add에서 합쳐지는 Transformer Block 흐름",
    },
  ],
  outlineSectionIds,
  sections: [
    ...blockOpeningSections,
    ...blockOperationSections,
    ...blockClosingSections,
  ],
  keyTakeaway: [
    {
      id: "block-key-takeaway",
      kind: "paragraph",
      text: "Pre-LN Block은 위치를 섞는 attention과 위치별 MLP를 각각 residual stream에 더해 hidden state를 두 번 갱신합니다.",
    },
  ],
  glossary: [
    "feature",
    "layer-norm",
    "pre-ln",
    "self-attention",
    "residual-connection",
    "mlp",
    "hidden-state",
  ],
  nextStep: {
    routeId: "decoder.self-attention",
    label: "Self-Attention",
  },
};
