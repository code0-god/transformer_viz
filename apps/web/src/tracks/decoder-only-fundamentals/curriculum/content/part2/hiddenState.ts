import { type Part2ChapterContent, part2Authorship } from "./glossary";

const TAKEAWAY =
  "Hidden State는 각 token의 현재 내부 표현이며, Transformer Block이 새로운 문맥 정보를 반영할 때마다 갱신됩니다.";

export const hiddenStateChapterContent = {
  page: {
    id: "decoder.curriculum.guide.2.3",
    routeId: "decoder.root",
    title: "Hidden State",
    learningGoal:
      "Block 경계의 [B,T,C]와 batch-one 표기 [T,C]를 연결하고, causal prefix를 반영하며 값이 갱신되는 shape 흐름을 추적한다.",
    introduction: [
      {
        id: "intro",
        kind: "paragraph",
        text: "Embedding 합은 계산의 끝이 아니라 첫 hidden state입니다. ‘the cat’의 각 위치가 Block을 지날 때 shape와 문맥 범위가 어떻게 이어지는지 봅니다.",
      },
    ],
    sections: [
      {
        id: "decoder.curriculum.guide.2.3.section",
        title: "같은 shape, 달라지는 문맥 표현",
        primaryNodeId: "decoder.root.hidden-state",
        blocks: [
          {
            id: "p.boundary",
            kind: "paragraph",
            text: "실제 Transformer Block은 batch, sequence, channel 축을 가진 [B,T,C] tensor를 입력받고 같은 경계 shape를 출력합니다.",
          },
          {
            id: "p.omission",
            kind: "paragraph",
            text: "이 Part의 symbolic 예시는 B=1이므로 batch 축을 생략해 [T,C]로 씁니다. 생략은 표기 선택이며 모델 tensor에서 축을 제거했다는 뜻이 아닙니다.",
          },
          {
            id: "p.shape-explanation",
            kind: "paragraph",
            text: "한 sequence를 보는 표기에서 hidden state X는 T개 token 위치마다 C 길이의 현재 표현을 둡니다.",
          },
          {
            id: "hidden-shape-formula",
            kind: "formula",
            formulaId: "fundamentals-hidden-state-shape",
          },
          {
            id: "p.update",
            kind: "paragraph",
            text: "X_0가 첫 Block을 지나면 X_1이 되고 이후 Block에서도 X의 [T,C] shape는 유지되지만 attention과 MLP가 반영한 값은 갱신됩니다.",
          },
          {
            id: "hidden-state-formula",
            kind: "formula",
            formulaId: "hidden-state",
          },
          {
            id: "p.block",
            kind: "paragraph",
            text: "Transformer Block은 현재 hidden state를 받아 새 hidden state로 보내는 반복 단위입니다. N은 현재 asset의 typed layer-count fact가 정합니다.",
          },
          {
            id: "transformer-block-formula",
            kind: "formula",
            formulaId: "transformer-block",
          },
          {
            id: "p.causal",
            kind: "paragraph",
            text: "각 위치는 자신보다 오른쪽의 미래 token을 보지 않습니다. 첫 위치는 첫 token까지, 뒤 위치는 시작부터 자기 위치까지의 causal prefix만 반영합니다.",
          },
          {
            id: "p.logits",
            kind: "paragraph",
            text: "최종 hidden state는 LM head에서 모든 위치의 [T,Vocab] logits로 바뀌고, generation은 마지막 위치의 [Vocab] 행을 읽습니다.",
          },
          {
            id: "shape-progression",
            kind: "steps",
            items: [
              {
                id: "token-ids-[T]",
                title: "Token IDs [T]",
                explanation: "Vocabulary addresses",
              },
              {
                id: "hidden-[T,C]",
                title: "Hidden states [T,C]",
                explanation: "B=1 표기의 내부 표현",
              },
              {
                id: "all-logits-[T,Vocab]",
                title: "All logits [T,Vocab]",
                explanation: "모든 위치의 후보 점수",
              },
              {
                id: "final-logits-[Vocab]",
                title: "Final logits [Vocab]",
                explanation: "다음 token에 쓰는 마지막 행",
              },
            ],
          },
          {
            id: "runtime.hidden-state",
            kind: "runtime-facts",
            adapterId: "current-model.hidden-state",
          },
          {
            id: "current-model.hidden-state",
            kind: "callout",
            tone: "important",
            title: "현재 모델 경계",
            text: "현재 source의 Block은 [B,T,C] 경계를 유지하고 explicit causal self-attention을 사용합니다. N과 C는 위 typed facts에서 표시합니다.",
          },
          {
            id: "misconception.single-vector",
            kind: "callout",
            tone: "warning",
            title: "오개념: hidden state는 vector 하나다",
            text: "Sequence의 각 token 위치마다 C 길이의 표현이 있습니다.",
          },
          {
            id: "misconception.stable-channel",
            kind: "callout",
            tone: "warning",
            title: "오개념: 한 channel은 늘 같은 단어 뜻이다",
            text: "Block을 지날 때 값은 문맥과 함께 갱신되며 channel 하나를 고정 의미표로 읽지 않습니다.",
          },
          {
            id: "misconception.inspector",
            kind: "callout",
            tone: "warning",
            title: "오개념: 이 Diagram은 tensor inspector다",
            text: "도식은 shape와 causal 정보 흐름만 설명하며 실제 tensor 값이나 layer 선택을 제공하지 않습니다.",
          },
          { id: "term.hidden", kind: "term", termId: "hidden-state" },
          { id: "term.block", kind: "term", termId: "transformer-block" },
          { id: "term.causal", kind: "term", termId: "causal-prefix" },
          { id: "term.shape", kind: "term", termId: "shape" },
        ],
      },
    ],
    outlineSectionIds: ["decoder.curriculum.guide.2.3.section"],
    keyTakeaway: [{ id: "takeaway", kind: "paragraph", text: TAKEAWAY }],
    glossary: ["hidden-state", "transformer-block", "causal-prefix", "shape"],
  },
  currentModelCalloutId: "current-model.hidden-state",
  runtimeFactsAdapterId: "current-model.hidden-state",
  primaryDiagramId: "decoder.diagram.representation.hidden-state",
  referenceIds: ["ref.tistory.24", "ref.repo.layers", "ref.nanogpt-pinned"],
  misconceptionIds: ["single-vector", "stable-channel", "inspector"],
  authorship: part2Authorship,
} as const satisfies Part2ChapterContent;
