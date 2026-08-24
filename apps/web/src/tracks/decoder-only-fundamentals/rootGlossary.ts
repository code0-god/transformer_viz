import type { GlossaryEntry } from "../types";

export const decoderRootGlossary: readonly GlossaryEntry[] = [
  {
    id: "token",
    term: "Token",
    definition:
      "모델이 한 번에 읽고 예측하는 어휘 단위입니다. 이 모델의 byte token은 단어 경계와 일치하지 않을 수 있습니다.",
  },
  {
    id: "context",
    term: "Context",
    definition:
      "현재 예측에 입력되는 token의 순서입니다. 새 token이 생성되면 context 뒤에 붙어 다음 예측의 입력이 됩니다.",
  },
  {
    id: "embedding",
    term: "Embedding",
    definition:
      "token이나 위치 같은 이산 정보를 모델이 계산할 수 있는 숫자 벡터로 바꾼 표현입니다. token embedding과 position embedding을 더해 초기 표현을 만듭니다.",
  },
  {
    id: "hidden-state",
    term: "Hidden State",
    definition:
      "각 위치에 대해 모델이 현재까지 계산해 둔 숫자 표현입니다. Transformer Block을 지날 때마다 같은 모양을 유지하면서 내용이 갱신됩니다.",
  },
  {
    id: "vocabulary",
    term: "Vocabulary",
    definition:
      "모델이 입력으로 읽거나 다음 token 후보로 예측할 수 있는 token의 전체 목록입니다.",
  },
  {
    id: "logit",
    term: "Logit",
    definition:
      "각 vocabulary 후보에 대해 모델이 출력하는 정규화 전 점수입니다. 확률로 사용하려면 선택 설정을 적용한 뒤 정규화해야 합니다.",
  },
  {
    id: "autoregressive-generation",
    term: "Autoregressive Generation",
    definition:
      "지금까지의 context에서 다음 token 하나를 예측하고, 그 token을 context에 붙여 같은 과정을 반복하는 생성 방식입니다.",
  },
];
