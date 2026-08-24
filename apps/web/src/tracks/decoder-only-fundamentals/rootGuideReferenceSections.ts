import type { LearningGuideSection } from "../types";
import { decoderGuideRuntimeAdapterIds } from "./guideRuntime";

export const decoderRootReferenceSections: readonly LearningGuideSection[] = [
  {
    id: "root-current-model",
    title: "현재 모델에서 확인하기",
    blocks: [
      {
        id: "root-current-model-intro",
        kind: "paragraph",
        text: "아래 값은 설명문에 적어 둔 예시가 아니라, 현재 로드된 모델 metadata에서 읽은 runtime 사실입니다.",
      },
      {
        id: "root-runtime-facts",
        kind: "runtime-facts",
        adapterId: decoderGuideRuntimeAdapterIds.rootFacts,
      },
    ],
  },
  {
    id: "root-formula-summary",
    title: "흐름을 수식으로 요약하기",
    blocks: [
      {
        id: "root-formula-summary-intro",
        kind: "paragraph",
        text: "자연어 흐름과 예시를 먼저 연결했다면, 이제 도식의 같은 단계를 수식으로 압축해 볼 수 있습니다.",
      },
      {
        id: "root-token-embedding-formula",
        kind: "formula",
        formulaId: "token-embedding",
      },
      {
        id: "root-position-embedding-formula",
        kind: "formula",
        formulaId: "position-embedding",
      },
      {
        id: "root-hidden-state-formula",
        kind: "formula",
        formulaId: "hidden-state",
      },
      {
        id: "root-block-formula",
        kind: "formula",
        formulaId: "transformer-block",
      },
      {
        id: "root-logits-formula",
        kind: "formula",
        formulaId: "logits",
      },
      {
        id: "root-append-formula",
        kind: "formula",
        formulaId: "append-context",
      },
    ],
  },
  {
    id: "root-misconceptions",
    title: "자주 생기는 오해",
    blocks: [
      {
        id: "root-misconception-token",
        kind: "callout",
        tone: "warning",
        title: "Token은 항상 단어 하나가 아닙니다",
        text: "byte token은 문자나 공백의 byte에 대응할 수 있고, token 경계는 단어 경계와 다를 수 있습니다.",
      },
      {
        id: "root-misconception-logit",
        kind: "callout",
        tone: "warning",
        title: "Logit은 확률이 아닙니다",
        text: "logit은 후보별 원시 점수이며 선택 전략의 정규화 과정을 거쳐야 합니다.",
      },
      {
        id: "root-misconception-forward",
        kind: "callout",
        tone: "warning",
        title: "한 번의 forward pass가 문장 전체를 만들지 않습니다",
        text: "한 단계는 다음 token 하나만 고르고, append와 full forward를 반복해 continuation을 만듭니다.",
      },
      {
        id: "root-misconception-cache",
        kind: "callout",
        tone: "warning",
        title: "이 runtime은 이전 계산을 KV cache로 재사용하지 않습니다",
        text: "각 단계에서 현재 context 전체의 hidden state를 다시 계산합니다.",
      },
    ],
  },
];
