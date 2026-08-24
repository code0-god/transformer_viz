import type { LearningGuideSection } from "../types";

export const blockOpeningSections: readonly LearningGuideSection[] = [
  {
    id: "block-overview",
    title: "Block의 목적",
    blocks: [
      {
        id: "block-purpose",
        kind: "paragraph",
        text: "Transformer Block은 문맥에서 위치 사이의 정보를 모으고, 각 위치의 feature를 변환한 뒤 그 결과를 residual stream에 더합니다.",
      },
    ],
  },
  {
    id: "block-input",
    title: "입력: 위치별 hidden state",
    blocks: [
      {
        id: "block-input-explanation",
        kind: "paragraph",
        text: "입력은 token 위치마다 하나의 hidden-state 벡터를 가진 행렬입니다. 각 행은 같은 feature 폭을 유지한 채 Block을 통과합니다.",
      },
      {
        id: "block-input-example",
        kind: "example",
        title: "세 token 위치의 개념적 입력",
        lines: [
          "위치 0 → feature 벡터",
          "위치 1 → feature 벡터",
          "위치 2 → feature 벡터",
        ],
      },
    ],
  },
];

export const blockClosingSections: readonly LearningGuideSection[] = [
  {
    id: "block-attention-vs-mlp",
    title: "Attention과 MLP 비교",
    blocks: [
      {
        id: "block-attention-mlp-comparison",
        kind: "comparison",
        columns: [
          {
            id: "block-attention-column",
            title: "Self-Attention",
            items: [
              "허용된 token 위치 사이의 정보를 모읍니다.",
              "문맥 관계를 반영합니다.",
            ],
          },
          {
            id: "block-mlp-column",
            title: "MLP",
            items: [
              "각 token 위치를 독립적으로 처리합니다.",
              "위치마다 같은 가중치를 공유합니다.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "block-depth",
    title: "N개 Block의 깊이",
    blocks: [
      {
        id: "block-depth-explanation",
        kind: "paragraph",
        text: "모델은 같은 구조의 Block을 N번 순서대로 적용하지만, 서로 다른 Block은 각각 별도의 학습된 가중치를 가집니다. 같은 계산 모양이 같은 파라미터를 뜻하지는 않습니다.",
      },
    ],
  },
  {
    id: "block-runtime",
    title: "현재 모델과 Layer",
    blocks: [
      {
        id: "block-runtime-explanation",
        kind: "paragraph",
        text: "현재 모델의 전체 Block 수와 선택한 Layer는 실행 중인 모델 metadata와 도식 상태에서 읽습니다.",
      },
      {
        id: "block-runtime-facts",
        kind: "runtime-facts",
        adapterId: "decoder.runtime.block-facts",
      },
    ],
  },
  {
    id: "block-formulas",
    title: "연산 순서 수식",
    blocks: [
      {
        id: "block-formula-introduction",
        kind: "paragraph",
        text: "앞에서 살펴본 여섯 연산을 같은 순서의 기호로 요약합니다.",
      },
      ...(
        [
          "layer-norm-1",
          "self-attention",
          "residual-1",
          "layer-norm-2",
          "mlp",
          "residual-2",
        ] as const
      ).map((formulaId) => ({
        id: `block-formula-${formulaId}`,
        kind: "formula" as const,
        formulaId,
      })),
    ],
  },
  {
    id: "block-misconceptions",
    title: "자주 생기는 오해",
    blocks: [
      {
        id: "block-misconception-list",
        kind: "bullets",
        items: [
          {
            id: "block-misconception-ln-mixing",
            title: "LayerNorm이 token을 섞는다",
            text: "LayerNorm은 각 위치 안의 feature를 정규화하며 위치 사이를 섞지 않습니다.",
          },
          {
            id: "block-misconception-residual-copy",
            title: "Residual은 입력을 그대로 보존한다",
            text: "Residual은 입력 경로와 하위 연산 결과를 더할 뿐, 의미나 값의 보존을 보장하지 않습니다.",
          },
          {
            id: "block-misconception-shared-blocks",
            title: "반복 Block은 가중치도 같다",
            text: "Block 구조는 같지만 깊이마다 서로 다른 학습된 가중치를 사용합니다.",
          },
        ],
      },
    ],
  },
];
