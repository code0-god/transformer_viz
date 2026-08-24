import type { GlossaryEntry } from "../types";

export const attentionGuideGlossary: readonly GlossaryEntry[] = [
  {
    id: "query",
    term: "Query (Q)",
    definition:
      "현재 위치가 어떤 정보를 찾고 있는지를 나타내는 표현입니다. 같은 입력 X에서 학습된 projection으로 만듭니다.",
  },
  {
    id: "key",
    term: "Key (K)",
    definition:
      "각 위치가 검색 대상으로서 어떤 특징을 가졌는지 나타내는 표현입니다. Query와의 내적으로 score를 만듭니다.",
  },
  {
    id: "value",
    term: "Value (V)",
    definition:
      "attention weight로 실제로 섞을 정보를 담는 표현입니다. score 계산에는 직접 들어가지 않습니다.",
  },
  {
    id: "head",
    term: "Head",
    definition:
      "model width C를 더 작은 차원 D로 나누어 attention을 병렬로 계산하는 단위입니다. 특정 head에 고정된 의미가 보장되지는 않습니다.",
  },
  {
    id: "score",
    term: "Score",
    definition:
      "Query와 Key의 내적으로 얻은 정규화 전 관련도입니다. 아직 확률이 아니며 음수나 큰 값도 가능합니다.",
  },
  {
    id: "causal-mask",
    term: "Causal Mask",
    definition:
      "각 Query 위치가 미래 Key 위치를 보지 못하게 막는 규칙입니다. 현재 위치와 그 이전 위치는 볼 수 있습니다.",
  },
  {
    id: "softmax",
    term: "Softmax",
    definition:
      "한 Query 행의 허용된 score를 합이 1인 양수 weight로 바꾸는 함수입니다. masked 위치의 weight는 0이 됩니다.",
  },
  {
    id: "attention-weight",
    term: "Attention Weight",
    definition:
      "Softmax 뒤 각 Value에 곱해지는 비율입니다. 큰 weight는 그 계산에서 더 크게 반영됐다는 뜻이지 완전한 설명이나 인과관계를 뜻하지는 않습니다.",
  },
  {
    id: "weighted-sum",
    term: "Weighted Sum",
    definition:
      "여러 Value에 각각 attention weight를 곱한 뒤 더하는 연산입니다. 한 Query 위치의 head output을 만듭니다.",
  },
];
