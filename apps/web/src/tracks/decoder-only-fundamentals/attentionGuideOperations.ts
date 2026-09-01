import type { LearningGuideSection } from "../types";
import {
  attentionInterpretationWarning,
  currentPositionVisibilityNote,
  scoreProbabilityWarning,
  valueVocabularyWarning,
} from "./attentionGuideMisconceptions";

const selectedOperationAdapterId = "decoder.runtime.selected-operation";

export const attentionOperationSections: readonly LearningGuideSection[] = [
  {
    id: "score",
    title: "Query와 Key 비교하기",
    primaryNodeId: "decoder.attention.score-matmul",
    associatedNodeIds: ["decoder.attention.score-matmul"],
    blocks: [
      scoreProbabilityWarning,
      {
        id: "score-formula",
        kind: "formula",
        formulaId: "attention-scores",
      },
      {
        id: "score-selected-operation",
        kind: "selected-operation",
        adapterId: selectedOperationAdapterId,
      },
    ],
  },
  {
    id: "scale",
    title: "Score 크기 조절하기",
    primaryNodeId: "decoder.attention.scale",
    associatedNodeIds: ["decoder.attention.scale"],
    blocks: [
      {
        id: "scale-formula",
        kind: "formula",
        formulaId: "attention-scale",
      },
      {
        id: "scale-selected-operation",
        kind: "selected-operation",
        adapterId: selectedOperationAdapterId,
      },
    ],
  },
  {
    id: "mask",
    title: "미래 Token 가리기",
    primaryNodeId: "decoder.attention.causal-mask",
    associatedNodeIds: ["decoder.attention.causal-mask"],
    blocks: [
      {
        id: "mask-four-token-example",
        kind: "example",
        title: "네 token에서 볼 수 있는 위치",
        lines: [
          "Query 0 → [✓, ×, ×, ×]",
          "Query 1 → [✓, ✓, ×, ×]",
          "Query 2 → [✓, ✓, ✓, ×]",
          "Query 3 → [✓, ✓, ✓, ✓]",
        ],
      },
      currentPositionVisibilityNote,
      {
        id: "mask-formula",
        kind: "formula",
        formulaId: "attention-causal-mask",
      },
      {
        id: "mask-selected-operation",
        kind: "selected-operation",
        adapterId: selectedOperationAdapterId,
      },
    ],
  },
  {
    id: "softmax",
    title: "Score를 Weight로 바꾸기",
    primaryNodeId: "decoder.attention.softmax",
    associatedNodeIds: ["decoder.attention.softmax"],
    blocks: [
      {
        id: "softmax-row-example",
        kind: "example",
        title: "한 Query 행의 예",
        lines: ["score: [0.4, 1.2, 0.7]", "weight: [0.22, 0.49, 0.29]"],
      },
      {
        id: "softmax-formula",
        kind: "formula",
        formulaId: "attention-softmax",
      },
      {
        id: "softmax-selected-operation",
        kind: "selected-operation",
        adapterId: selectedOperationAdapterId,
      },
    ],
  },
  {
    id: "value",
    title: "Value를 가중합하기",
    primaryNodeId: "decoder.attention.value-matmul",
    associatedNodeIds: ["decoder.attention.value-matmul"],
    blocks: [
      {
        id: "value-expansion-example",
        kind: "example",
        title: "세 Value의 weighted sum",
        lines: ["Y_i = 0.22 V₀ + 0.49 V₁ + 0.29 V₂"],
      },
      valueVocabularyWarning,
      {
        id: "value-formula",
        kind: "formula",
        formulaId: "attention-value-aggregation",
      },
      {
        id: "value-selected-operation",
        kind: "selected-operation",
        adapterId: selectedOperationAdapterId,
      },
    ],
  },
  {
    id: "merge",
    title: "Head를 합쳐 출력 만들기",
    primaryNodeId: "decoder.attention.merge-heads",
    associatedNodeIds: [
      "decoder.attention.merge-heads",
      "decoder.attention.output-projection",
    ],
    blocks: [
      {
        id: "merge-formula",
        kind: "formula",
        formulaId: "attention-merge-heads",
      },
      {
        id: "output-projection-formula",
        kind: "formula",
        formulaId: "attention-output-projection",
      },
      attentionInterpretationWarning,
      {
        id: "merge-selected-operation",
        kind: "selected-operation",
        adapterId: selectedOperationAdapterId,
      },
      {
        id: "attention-full-formula",
        kind: "formula",
        formulaId: "attention-summary",
        explanation:
          "앞에서 살펴본 score, scale, mask, Softmax, Value 가중합을 한 줄로 모은 최종 요약입니다.",
      },
    ],
  },
];
