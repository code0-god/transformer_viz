import { type Part0ChapterContent, part0Authorship } from "./glossary";

const TAKEAWAY =
  "자연어 처리 모델은 사람이 사용하는 텍스트를 숫자로 표현해 계산하고, 그 결과를 사람이 활용할 수 있는 형태로 바꿉니다.";

export const nlpChapterContent = {
  page: {
    id: "decoder.curriculum.guide.0.1",
    routeId: "decoder.root",
    title: "자연어 처리란?",
    learningGoal:
      "사람이 사용하는 언어가 모델의 숫자 계산으로 바뀌는 전체 흐름을 먼저 살펴봅니다.",
    introduction: [
      {
        id: "intro",
        kind: "paragraph",
        text: "컴퓨터에게 문장을 읽고 판단하거나 새로운 글을 만들어 달라고 하려면 무엇부터 해야 할까요? 이 질문에서 자연어 처리 공부를 시작하겠습니다.",
      },
    ],
    sections: [
      {
        id: "everyday-question",
        title: "언어로 해결할 수 있는 문제",
        primaryNodeId: "decoder.root.input-context",
        blocks: [
          {
            id: "p.everyday-question",
            kind: "paragraph",
            text: "우리는 매일 질문에 답하고, 문장의 분위기를 판단하고, 필요한 정보를 찾고, 다음 문장을 이어 씁니다. 자연어 처리 모델은 이런 언어 문제를 컴퓨터의 계산으로 다루도록 돕습니다.",
          },
          {
            id: "p.everyday-tasks",
            kind: "paragraph",
            text: "문장 분류, 질문 응답, 번역, 텍스트 생성은 자연어 처리로 다룰 수 있는 대표적인 문제입니다. 먼저 어떤 입력이 어떤 결과로 이어지는지 살펴보겠습니다.",
          },
        ],
      },
      {
        id: "nlp-definition",
        title: "사람의 언어를 계산으로 다루는 분야",
        blocks: [
          {
            id: "p.nlp-definition",
            kind: "paragraph",
            text: "자연어 처리는 사람이 사용하는 언어를 컴퓨터가 처리할 수 있도록 만들고, 그 결과를 분류·검색·번역·생성과 같은 형태로 활용하는 분야입니다.",
          },
          {
            id: "misconception.human-understanding",
            kind: "callout",
            tone: "warning",
            title: "모델이 사람처럼 문장을 이해할까요?",
            text: "모델은 사람처럼 뜻을 경험하거나 생각하지 않습니다. 입력을 숫자로 표현하고, 학습된 규칙에 따라 계산한 결과를 내놓습니다.",
          },
        ],
      },
      {
        id: "why-numbers",
        title: "왜 숫자로 바꾸어야 할까요?",
        blocks: [
          {
            id: "p.why-numbers",
            kind: "paragraph",
            text: "신경망의 연산은 숫자를 대상으로 합니다. 따라서 사람이 보는 텍스트와 모델의 계산 사이에는 텍스트를 계산 가능한 숫자 표현으로 바꾸는 단계가 필요합니다. 구체적인 방법은 다음 Chapter부터 차례로 살펴봅니다.",
          },
          {
            id: "big-picture",
            kind: "steps",
            items: [
              { id: "text", title: "사람이 쓰는 텍스트" },
              { id: "numeric-representation", title: "숫자로 표현하기" },
              { id: "model-computation", title: "모델의 계산" },
              { id: "usable-result", title: "사람이 사용하는 결과" },
            ],
          },
        ],
      },
      {
        id: "tasks",
        title: "입력과 결과를 함께 보기",
        blocks: [
          {
            id: "p.tasks",
            kind: "paragraph",
            text: "같은 텍스트라도 해결하려는 문제에 따라 결과의 모습은 달라집니다. 분류에서는 범주를, 정보 찾기에서는 필요한 항목을, 생성에서는 이어질 텍스트를 결과로 사용합니다.",
          },
          {
            id: "classification-example",
            kind: "example",
            title: "문장 분류",
            lines: [
              '입력: "이 설명은 흐름이 분명해서 좋았어요."',
              "결과: 긍정",
            ],
          },
          {
            id: "information-example",
            kind: "example",
            title: "정보 찾기",
            lines: [
              '입력: "수연은 광주에서 열린 회의에 참석했습니다."',
              "결과: 사람 — 수연 / 장소 — 광주",
            ],
          },
          {
            id: "translation-example",
            kind: "example",
            title: "번역",
            lines: [
              '입력: "오늘은 비가 옵니다."',
              '결과: "It is raining today."',
            ],
          },
          {
            id: "generation-example",
            kind: "example",
            title: "텍스트 생성",
            lines: [
              '입력: "우주선은 조용히"',
              "결과: 입력 뒤에 이어질 새로운 텍스트",
            ],
          },
        ],
      },
      {
        id: "training-vs-inference",
        title: "학습과 사용은 다릅니다",
        blocks: [
          {
            id: "p.training",
            kind: "paragraph",
            text: "학습(training)은 많은 예시를 보고 모델 내부의 숫자인 가중치를 조정하는 과정입니다. 모델은 이 과정에서 입력과 결과 사이의 규칙을 익힙니다.",
          },
          {
            id: "p.inference",
            kind: "paragraph",
            text: "추론(inference)은 학습이 끝난 모델에 새로운 입력을 주고 결과를 계산하는 과정입니다. 학습과 추론은 서로 이어지지만 같은 작업은 아닙니다.",
          },
          {
            id: "current-model.nanogpt",
            kind: "callout",
            tone: "note",
            title: "현재 nanoGPT Edu에서는",
            text: "이 사이트는 미리 학습된 작은 nanoGPT 교육용 모델을 사용합니다. 브라우저에서는 모델을 새로 학습하지 않고, 준비된 모델이 입력으로 결과를 계산하는 추론 과정을 살펴봅니다.",
          },
          {
            id: "term.natural-language",
            kind: "term",
            termId: "natural-language",
          },
          { id: "term.training", kind: "term", termId: "training" },
          { id: "term.inference", kind: "term", termId: "inference" },
        ],
      },
      {
        id: "roadmap",
        title: "이 과정에서 배우는 순서",
        blocks: [
          {
            id: "p.roadmap",
            kind: "paragraph",
            text: "이제 텍스트가 모델의 계산을 거쳐 결과가 되는 길을 한 단계씩 따라갑니다. 지금은 전체 순서만 확인하고, 각 개념의 뜻과 계산은 해당 Chapter에서 배웁니다.",
          },
          {
            id: "course-roadmap",
            kind: "steps",
            items: [
              { id: "roadmap.text", title: "Text" },
              { id: "roadmap.token", title: "Token" },
              { id: "roadmap.token-id", title: "Token ID" },
              {
                id: "roadmap.vector-representation",
                title: "Vector Representation",
              },
              { id: "roadmap.language-model", title: "Language Model" },
              { id: "roadmap.gpt", title: "GPT" },
              {
                id: "roadmap.transformer-block",
                title: "Transformer Block",
              },
              {
                id: "roadmap.self-attention",
                title: "Self-Attention",
              },
            ],
          },
        ],
      },
    ],
    outlineSectionIds: [
      "everyday-question",
      "nlp-definition",
      "why-numbers",
      "tasks",
      "training-vs-inference",
      "roadmap",
    ],
    keyTakeaway: [{ id: "remember", kind: "paragraph", text: TAKEAWAY }],
    glossary: ["natural-language", "training", "inference"],
  },
  primaryDiagramId: "decoder.diagram.intro.nlp",
  referenceIds: [
    "ref.tistory.21",
    "ref.repo.generation",
    "ref.transformer-paper",
  ],
  misconceptionIds: ["human-understanding"],
  authorship: part0Authorship("symbolic"),
} as const satisfies Part0ChapterContent;
