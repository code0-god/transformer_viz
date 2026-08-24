import type { GuideBlock } from "../types";

export const scoreProbabilityWarning: GuideBlock = {
  id: "score-probability-warning",
  kind: "callout",
  tone: "warning",
  title: "Score는 probability가 아닙니다",
  text: "Score는 비교를 위한 원시 값입니다. Scale, Causal Mask, Softmax를 모두 지난 뒤에야 합이 1인 attention weight가 됩니다.",
};

export const valueVocabularyWarning: GuideBlock = {
  id: "value-vocabulary-warning",
  kind: "callout",
  tone: "warning",
  title: "V는 vocabulary가 아닙니다",
  text: "여기서 V는 Value tensor입니다. 모델의 전체 token 목록을 뜻하는 vocabulary와는 다른 개념입니다.",
};

export const currentPositionVisibilityNote: GuideBlock = {
  id: "current-position-visibility-note",
  kind: "callout",
  tone: "important",
  title: "현재 위치는 볼 수 있습니다",
  text: "Causal mask는 미래만 차단합니다. Query 위치 i는 Key 위치 j가 i 이하일 때 현재 위치와 과거 위치를 모두 볼 수 있습니다.",
};

export const attentionInterpretationWarning: GuideBlock = {
  id: "attention-interpretation-warning",
  kind: "callout",
  tone: "warning",
  title: "Weight를 의미 지도처럼 단정하지 않습니다",
  text: "큰 attention weight는 이 head의 이 계산에서 해당 Value가 더 크게 섞였다는 뜻입니다. 모델 전체의 설명, 인과관계, 또는 head의 고정된 의미를 증명하지는 않습니다.",
};

export const attentionGuideTakeaway: readonly GuideBlock[] = [
  {
    id: "attention-key-takeaway",
    kind: "paragraph",
    text: "Causal Self-Attention은 현재 위치까지의 Key와 Query를 비교해 weight를 만들고, 그 weight로 Value를 섞은 뒤 모든 head를 합쳐 다음 hidden state에 전달합니다.",
  },
];
