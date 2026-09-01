import { type Part1ChapterContent, part1Authorship } from "./glossary";

const TAKEAWAY =
  "Decoder-only 언어 모델은 현재까지의 token sequence를 조건으로 다음 token 후보를 평가합니다.";

export const definitionChapterContent = {
  page: {
    id: "decoder.curriculum.guide.1.1",
    routeId: "decoder.root",
    title: "언어 모델이란?",
    learningGoal:
      "언어 모델을 현재 context에서 다음 token 후보를 평가하는 모델로 설명하고, Transformer architecture 및 사실 판별과 구분한다.",
    introduction: [
      {
        id: "intro.unfinished-sentence",
        kind: "paragraph",
        text: "‘The cat sat on the ...’라는 문장을 보면 mat, floor, chair 같은 표현을 떠올릴 수 있습니다. 이것은 실제 모델 출력이 아니라, 지금까지 주어진 표현을 바탕으로 다음에 올 후보를 예상하는 상황을 설명하기 위한 예입니다.",
      },
      {
        id: "intro.question",
        kind: "paragraph",
        text: "Part 0에서는 text가 token과 Token ID로 바뀌는 과정을 살펴보았습니다. 이제 질문은 ‘그 token들을 받은 모델이 무엇을 계산하는가?’로 바뀝니다.",
      },
    ],
    sections: [
      {
        id: "decoder.curriculum.guide.1.1.section",
        title: "Context에서 다음 token 후보까지",
        primaryNodeId: "decoder.root.input-context",
        blocks: [
          {
            id: "p.context",
            kind: "paragraph",
            text: "Context는 현재까지 모델에 주어진 token sequence입니다. Prompt로 입력한 token뿐 아니라, 생성 과정에서 앞서 선택한 token도 다음 예측의 context에 포함될 수 있습니다.",
          },
          {
            id: "p.definition",
            kind: "paragraph",
            text: "Decoder-only 언어 모델(language model)은 현재 context의 앞쪽 token들만 이용해 다음 위치에 올 token 후보들을 평가합니다. 완성된 문장을 한 번에 꺼내는 대신, 바로 다음 한 칸에 집중합니다.",
          },
          {
            id: "figure.language-model-definition",
            kind: "figure",
            figureId: "decoder.diagram.language-model.definition",
            size: "wide",
            caption:
              "현재 context는 언어 모델을 거쳐 여러 다음 token 후보로 이어집니다. 후보는 설명을 위한 예이며 실제 모델 출력이 아닙니다.",
            alt: "현재 context를 받아 다음 token 후보를 평가하는 언어 모델의 역할",
          },
          {
            id: "p.candidates",
            kind: "paragraph",
            text: "후보는 사람이 떠올린 몇 개의 단어 목록이 아니라 vocabulary에 등록된 token들입니다. 현재 tokenizer는 byte 기반이므로, 화면에 보이는 한 단어가 여러 token으로 이어질 수도 있습니다.",
          },
          {
            id: "p.relative-likelihood",
            kind: "paragraph",
            text: "이 Chapter에서는 모델의 출력을 ‘다음 token 후보에 대한 상대적인 가능성’으로 읽습니다. 어떤 후보가 다른 후보보다 context에 더 잘 이어지는지를 비교한다는 뜻이며, 구체적인 숫자는 다음 Chapter에서 구분합니다.",
          },
          {
            id: "p.language-model-transformer",
            kind: "paragraph",
            text: "언어 모델은 다음 token을 평가하는 역할을 가리키고, Transformer는 그 역할을 구현할 수 있는 neural architecture 중 하나입니다. 두 용어는 같은 뜻이 아닙니다.",
          },
          {
            id: "p.truth",
            kind: "paragraph",
            text: "높게 평가된 후보가 사실이라는 뜻도 아닙니다. 언어 모델은 context와 학습된 패턴에 따라 후보를 평가할 뿐, 문장의 진위를 판정하는 별도의 장치는 아닙니다.",
          },
          {
            id: "p.next-question",
            kind: "paragraph",
            text: "그렇다면 모델은 다음 token 후보를 어떤 숫자로 표현할까요? 다음 Chapter에서는 vocabulary 전체의 후보 점수에서 token 하나가 선택되기까지를 살펴봅니다.",
          },
          {
            id: "shape-flow",
            kind: "steps",
            items: [
              {
                id: "context",
                title: "Context",
                explanation: "현재까지 주어진 token sequence",
              },
              {
                id: "language-model",
                title: "Language model",
                explanation: "다음 위치의 후보를 평가",
              },
              {
                id: "next-token-candidates",
                title: "Next-token candidates",
                explanation: "Vocabulary 안의 가능한 다음 token",
              },
            ],
          },
          {
            id: "current-model.definition",
            kind: "callout",
            tone: "important",
            title: "현재 모델 경계",
            text: "현재 nanoGPT Edu는 앞선 token만 참고하는 decoder-only 언어 모델입니다. 이 Chapter에서는 모델 내부 구조보다 context와 다음 token 후보의 관계에 집중합니다.",
          },
          {
            id: "misconception.whole-sentence",
            kind: "callout",
            tone: "warning",
            title: "오개념: 모델이 완성 문장을 한 번에 출력한다",
            text: "이 Chapter에서 정의한 모델의 출력 범위는 완성 문장이 아니라 바로 다음 위치의 token 후보입니다.",
          },
          {
            id: "misconception.truth",
            kind: "callout",
            tone: "warning",
            title: "오개념: 가능성이 높으면 사실이다",
            text: "높은 가능성은 context에 더 잘 이어진다는 평가이며, 사실 여부를 보증하지 않습니다.",
          },
          {
            id: "misconception.word",
            kind: "callout",
            tone: "warning",
            title: "오개념: 항상 단어 하나를 예측한다",
            text: "모델이 평가하는 단위는 tokenizer가 정한 token입니다. 한 token이 한 단어와 같다고 단정할 수 없습니다.",
          },
          {
            id: "misconception.architecture",
            kind: "callout",
            tone: "warning",
            title: "오개념: 언어 모델과 Transformer는 같은 말이다",
            text: "언어 모델은 예측 역할이고 Transformer는 그 역할을 구현하는 architecture입니다.",
          },
          { id: "term.language-model", kind: "term", termId: "language-model" },
          { id: "term.context", kind: "term", termId: "context" },
          { id: "term.decoder-only", kind: "term", termId: "decoder-only" },
        ],
      },
    ],
    outlineSectionIds: ["decoder.curriculum.guide.1.1.section"],
    keyTakeaway: [{ id: "takeaway", kind: "paragraph", text: TAKEAWAY }],
    glossary: ["language-model", "context", "decoder-only"],
  },
  currentModelCalloutId: "current-model.definition",
  primaryDiagramId: "decoder.diagram.language-model.definition",
  referenceIds: ["ref.tistory.23", "ref.repo.model", "ref.nanogpt-pinned"],
  misconceptionIds: ["whole-sentence", "truth", "word", "architecture"],
  chapterRole: "what",
  figureQuestion: "언어 모델은 현재 context를 받아 무엇을 평가하는가?",
  authorship: part1Authorship,
} as const satisfies Part1ChapterContent;
