import type { GlossaryEntry } from "../types";

export const blockGuideGlossary: readonly GlossaryEntry[] = [
  {
    id: "feature",
    term: "Feature",
    definition:
      "각 token 위치의 hidden state를 이루는 개별 숫자 축입니다. 여러 feature가 함께 그 위치의 현재 표현을 구성합니다.",
  },
  {
    id: "layer-norm",
    term: "LayerNorm",
    definition:
      "한 token 위치 안의 feature들을 정규화하는 연산입니다. 서로 다른 token 위치의 정보를 섞지 않습니다.",
  },
  {
    id: "pre-ln",
    term: "Pre-LN",
    definition:
      "Attention이나 MLP를 실행하기 전에 LayerNorm을 적용하는 Block 배치 방식입니다. 이 모델은 두 하위 연산 앞에서 각각 정규화합니다.",
  },
  {
    id: "self-attention",
    term: "Self-Attention",
    definition:
      "각 token 위치가 허용된 문맥의 다른 위치를 참고해 정보를 모으는 연산입니다. Decoder에서는 미래 위치를 볼 수 없습니다.",
  },
  {
    id: "residual-connection",
    term: "Residual Connection",
    definition:
      "하위 연산의 출력을 그 연산에 들어가기 전 residual stream에 더하는 경로입니다. 덧셈이 이전 정보를 그대로 보존하거나 우세하게 유지한다고 보장하지는 않습니다.",
  },
  {
    id: "mlp",
    term: "MLP",
    definition:
      "각 token 위치의 feature를 독립적으로 변환하는 feed-forward network입니다. 같은 Block 안에서는 모든 token 위치가 같은 MLP 가중치를 공유합니다.",
  },
  {
    id: "hidden-state",
    term: "Hidden State",
    definition:
      "모델이 각 token 위치에 대해 현재까지 계산한 feature 벡터입니다. Block을 지날 때 attention과 MLP 결과가 더해지며 갱신됩니다.",
  },
];
