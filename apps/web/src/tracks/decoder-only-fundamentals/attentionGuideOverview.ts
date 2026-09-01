import type { GuideBlock, LearningGuideSection } from "../types";

const selectedOperationAdapterId = "decoder.runtime.selected-operation";

export const attentionGuideIntroduction: readonly GuideBlock[] = [
  {
    id: "attention-input-overview",
    kind: "rich-paragraph",
    content: [
      { kind: "strong", text: "입력 X" },
      {
        kind: "text",
        text: "는 선택한 Transformer Block의 LayerNorm 1 출력이며 shape은 ",
      },
      { kind: "code", code: "[T, C]" },
      {
        kind: "text",
        text: "입니다. T개 token 위치마다 C개의 feature가 있고, attention은 위치 사이에서 정보를 섞습니다.",
      },
    ],
  },
  {
    id: "narrative.self-attention",
    kind: "visual-narrative",
    layout: "sticky",
    label: "Causal Self-Attention 계산 흐름",
    beats: [
      {
        id: "overview",
        label: "Overview",
        stage: "overview",
        text: "Causal Self-Attention은 Q와 K로 과거·현재 위치의 weights를 만들고, 그 weights로 V를 합쳐 새 token 표현을 만듭니다.",
      },
      {
        id: "qkv",
        label: "Q/K/V",
        stage: "qkv",
        text: "하나의 combined QKV projection이 X를 한 번 투영한 뒤 결과를 Query, Key, Value 세 부분으로 나눕니다. 세 표현은 같은 X에서 시작하지만 서로 다른 학습된 역할을 갖습니다.",
      },
      {
        id: "scores",
        label: "Scores",
        stage: "scores",
        text: "각 Query 위치와 모든 Key 위치의 내적을 계산하면 한 head에 T×T score 표가 생깁니다. 값이 클수록 이 head의 현재 비교에서 두 표현이 더 잘 맞는다는 뜻입니다. D가 커지면 내적의 절댓값도 커지기 쉬워 Softmax가 지나치게 뾰족해질 수 있으므로 score를 √D로 나누어 안정적인 범위로 조절합니다.",
      },
      {
        id: "mask",
        label: "Mask",
        stage: "mask",
        text: "텍스트 생성 시 위치 i는 아직 생성되지 않은 미래 위치를 참조하면 안 됩니다. Causal mask는 j가 i보다 큰 score를 차단해 Softmax weight가 0이 되게 합니다.",
      },
      {
        id: "softmax",
        label: "Softmax",
        stage: "softmax",
        text: "Softmax는 한 Query 행의 허용된 score를 양수로 바꾸고 합을 1로 맞춥니다. 이제 각 값은 다음 Value weighted sum에 사용할 비율입니다.",
      },
      {
        id: "value",
        label: "Value",
        stage: "value",
        text: "각 attention weight를 대응하는 Value 벡터에 곱해 모두 더하면 현재 Query 위치의 head output이 됩니다. Q와 K는 섞을 비율을 정했고, 실제로 전달되는 내용은 V에서 옵니다. H개 head output을 다시 C폭으로 이어 붙인 뒤 output projection을 적용하면 Transformer Block의 첫 residual 경로에 더해질 attention 출력 Y_attn이 됩니다.",
      },
    ],
    figure: {
      id: "figure.self-attention",
      kind: "figure",
      figureId: "self-attention",
      size: "full",
      caption:
        "Causal Self-Attention은 Q와 K로 과거·현재 위치의 weights를 만들고, 그 weights로 V를 합쳐 새 token 표현을 만듭니다.",
      alt: "Q/K/V projection, score matrix, causal mask, Softmax, weighted V, head merge, output projection 흐름",
    },
  },
];

export const attentionOverviewSections: readonly LearningGuideSection[] = [
  {
    id: "qkv",
    title: "입력에서 Q, K, V 만들기",
    primaryNodeId: "decoder.attention.qkv-projection",
    associatedNodeIds: ["decoder.attention.qkv-projection"],
    blocks: [
      {
        id: "qkv-search-analogy",
        kind: "callout",
        tone: "analogy",
        title: "검색에 빗대어 보기",
        text: "Query는 찾고 싶은 조건, Key는 각 항목의 색인, Value는 선택 뒤 가져올 내용에 가깝습니다. 다만 실제 Q/K/V는 사람이 정한 단어표가 아니라 학습된 연속 벡터이므로 비유를 문자 그대로 해석하면 안 됩니다.",
      },
      {
        id: "qkv-projection-formula",
        kind: "formula",
        formulaId: "attention-qkv-projection",
      },
      {
        id: "qkv-selected-operation",
        kind: "selected-operation",
        adapterId: selectedOperationAdapterId,
      },
    ],
  },
  {
    id: "heads",
    title: "여러 Head로 나누기",
    primaryNodeId: "decoder.attention.query",
    associatedNodeIds: [
      "decoder.attention.query",
      "decoder.attention.key",
      "decoder.attention.value",
    ],
    blocks: [
      {
        id: "heads-dimension",
        kind: "rich-paragraph",
        content: [
          { kind: "text", text: "Q, K, V는 H개 head로 나뉘며 각 head의 폭은 " },
          { kind: "code", code: "D = C / H" },
          {
            kind: "text",
            text: "입니다. 각 head는 자기 D차원 공간에서 같은 attention 절차를 병렬로 수행합니다.",
          },
        ],
      },
      {
        id: "heads-role-caveat",
        kind: "callout",
        tone: "note",
        text: "head마다 다른 패턴을 학습할 수 있지만, 특정 head가 언제나 문법이나 대명사만 담당한다고 고정해 말할 수는 없습니다.",
      },
      {
        id: "heads-query-formula",
        kind: "formula",
        formulaId: "attention-query-heads",
      },
      {
        id: "heads-selected-operation",
        kind: "selected-operation",
        adapterId: selectedOperationAdapterId,
      },
    ],
  },
];
