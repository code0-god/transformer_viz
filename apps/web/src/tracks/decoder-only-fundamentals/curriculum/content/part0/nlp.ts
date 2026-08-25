import { type Part0ChapterContent, part0Authorship } from "./glossary";

const TAKEAWAY =
  "자연어 처리 모델은 텍스트를 숫자 표현으로 바꾸어 계산하고, 그 결과를 사람이 사용하는 형태로 해석합니다.";

export const nlpChapterContent = {
  page: {
    id: "decoder.curriculum.guide.0.1",
    routeId: "decoder.root",
    title: "자연어 처리란?",
    learningGoal:
      "자연어 텍스트가 추론에서 숫자 계산과 출력으로 이어지는 경계를 설명한다.",
    introduction: [
      {
        id: "intro",
        kind: "paragraph",
        text: "컴퓨터는 문장의 뜻을 그대로 계산하지 않습니다. 자연어 처리에서는 사람이 쓴 입력과 모델이 계산할 수 있는 표현 사이에 분명한 변환 경계가 필요합니다.",
      },
    ],
    sections: [
      {
        id: "decoder.curriculum.guide.0.1.section",
        title: "텍스트가 출력이 되기까지",
        primaryNodeId: "decoder.root.input-context",
        blocks: [
          {
            id: "p.boundary",
            kind: "paragraph",
            text: "입력 텍스트는 먼저 tokenizer를 지나 token의 순서로 나뉘고, 각 token은 vocabulary의 주소인 Token ID로 표현됩니다.",
          },
          {
            id: "p.compute",
            kind: "paragraph",
            text: "Neural Model은 Token ID에서 시작한 숫자 표현을 사전 학습 가중치와 함께 계산합니다. 이 화면은 가중치를 바꾸지 않고 이미 학습된 모델을 사용하는 추론 경로를 설명합니다.",
          },
          {
            id: "p.logits",
            kind: "paragraph",
            text: "모델의 직접 출력인 logits는 후보마다 붙은 원점수입니다. 값의 상대적 크기는 후보 선호를 나타내지만, logit 자체를 확률로 읽을 수는 없습니다.",
          },
          {
            id: "p.selection",
            kind: "paragraph",
            text: "Softmax와 sampling 단계는 logits를 선택 가능한 분포로 해석하고 다음 출력을 정합니다. 모델 계산과 선택 규칙은 서로 이어지지만 같은 역할은 아닙니다.",
          },
          {
            id: "p.output",
            kind: "paragraph",
            text: "선택된 결과는 token 또는 task label처럼 기계가 다루는 값일 수 있습니다. 마지막에는 사람이 읽는 텍스트나 분류 결과처럼 과업에 맞는 형태로 해석됩니다.",
          },
          {
            id: "p.scope",
            kind: "paragraph",
            text: "자연어 처리는 생성뿐 아니라 분류, 검색, 요약처럼 언어를 입력이나 출력으로 다루는 여러 과업을 포함합니다. 하나의 파이프라인은 그 공통 경계를 보여 줍니다.",
          },
          {
            id: "pipeline",
            kind: "steps",
            items: [
              { id: "natural-language-text", title: "Natural Language Text" },
              { id: "tokenizer", title: "Tokenizer" },
              { id: "token-ids", title: "Token IDs" },
              { id: "neural-model", title: "Neural Model" },
              { id: "logits", title: "Logits" },
              { id: "softmax-sampling", title: "Softmax/Sampling" },
              { id: "task-output", title: "Task Output" },
            ],
          },
          {
            id: "misconception.app-training",
            kind: "callout",
            tone: "warning",
            title: "오개념: 앱이 모델을 훈련한다",
            text: "이 학습 화면은 모델 가중치를 훈련하지 않습니다. 준비된 가중치로 추론 경로를 읽습니다.",
          },
          {
            id: "misconception.logit-probability",
            kind: "callout",
            tone: "warning",
            title: "오개념: logit이 곧 확률이다",
            text: "logit은 정규화 전 점수이고 확률은 별도의 변환과 선택 조건을 거친 값입니다.",
          },
          {
            id: "misconception.generation-only",
            kind: "callout",
            tone: "warning",
            title: "오개념: NLP는 생성만 뜻한다",
            text: "언어를 계산 대상으로 삼는 다양한 과업이 자연어 처리에 포함됩니다.",
          },
          {
            id: "term.natural-language",
            kind: "term",
            termId: "natural-language",
          },
          { id: "term.inference", kind: "term", termId: "inference" },
          { id: "term.logit", kind: "term", termId: "logit" },
          {
            id: "term.pretrained-weights",
            kind: "term",
            termId: "pretrained-weights",
          },
        ],
      },
    ],
    outlineSectionIds: ["decoder.curriculum.guide.0.1.section"],
    keyTakeaway: [{ id: "takeaway", kind: "paragraph", text: TAKEAWAY }],
    glossary: ["natural-language", "inference", "logit", "pretrained-weights"],
  },
  primaryDiagramId: "decoder.diagram.intro.nlp",
  referenceIds: [
    "ref.tistory.21",
    "ref.repo.generation",
    "ref.transformer-paper",
  ],
  misconceptionIds: ["app-training", "logit-probability", "generation-only"],
  authorship: part0Authorship("symbolic"),
} as const satisfies Part0ChapterContent;
