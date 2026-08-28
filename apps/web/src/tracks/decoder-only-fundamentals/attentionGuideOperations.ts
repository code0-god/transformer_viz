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
      {
        id: "score-explanation",
        kind: "paragraph",
        text: "각 Query 위치와 모든 Key 위치의 내적을 계산하면 한 head에 T×T score 표가 생깁니다. 값이 클수록 이 head의 현재 비교에서 두 표현이 더 잘 맞는다는 뜻입니다.",
      },
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
        id: "scale-explanation",
        kind: "paragraph",
        text: "D가 커지면 내적의 절댓값도 커지기 쉬워 Softmax가 지나치게 뾰족해질 수 있습니다. score를 √D로 나누어 비교값의 크기를 안정적인 범위로 조절합니다.",
      },
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
        id: "mask-explanation",
        kind: "paragraph",
        text: "텍스트 생성 시 위치 i는 아직 생성되지 않은 미래 위치를 참조하면 안 됩니다. Causal mask는 j가 i보다 큰 score를 차단해 Softmax weight가 0이 되게 합니다.",
      },
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
        id: "softmax-explanation",
        kind: "paragraph",
        text: "Softmax는 한 Query 행의 허용된 score를 양수로 바꾸고 합을 1로 맞춥니다. 이제 각 값은 다음 Value weighted sum에 사용할 비율입니다.",
      },
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
        id: "value-explanation",
        kind: "paragraph",
        text: "각 attention weight를 대응하는 Value 벡터에 곱해 모두 더하면 현재 Query 위치의 head output이 됩니다. Q와 K는 섞을 비율을 정했고, 실제로 전달되는 내용은 V에서 옵니다.",
      },
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
        id: "merge-explanation",
        kind: "paragraph",
        text: "H개 head output을 다시 C폭으로 이어 붙인 뒤 output projection을 적용합니다. 결과 Y_attn은 Transformer Block의 첫 residual 경로에 더해질 attention 출력입니다.",
      },
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
