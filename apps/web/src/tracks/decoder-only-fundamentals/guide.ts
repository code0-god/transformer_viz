import type {
  GlossaryEntry,
  LearningGuideCatalog,
  LearningGuidePage,
  LearningRouteId,
} from "../types";
import { decoderAttentionSymbols, decoderNotationEntries } from "./notation";
import {
  attentionKeyTakeaway,
  attentionOperationNodeIds,
  blockKeyTakeaway,
  rootAssociatedNodeIds,
  rootKeyTakeaway,
} from "./validationMetadata";

class DecoderGuideError extends Error {
  constructor(readonly routeId: LearningRouteId) {
    super(`Decoder guide page is missing: ${routeId}`);
    this.name = "DecoderGuideError";
  }
}

export const decoderBlockGuideCopy = {
  currentModel: "현재 모델",
  selectedLayer: "선택 Layer",
  formulas: "수식",
} as const;

export const decoderAttentionGuideCopy = {
  inputExplanation: "는 선택한 Transformer Block의 LayerNorm 1 출력입니다.",
  symbolsTitle: "A. 기호",
  currentModelTitle: "B. 현재 모델값",
  currentOperationTitle: "C. 현재 연산",
  flowTitle: "Self-Attention flow",
  summaryLabel: "한 줄 요약",
  symbolicShape: "Symbolic shape",
  currentShape: "Current shape",
  pending: "실행 후 표시",
  scoreKept: "score 유지",
  blocked: "차단",
} as const;

const glossary: readonly GlossaryEntry[] = decoderAttentionSymbols.map(
  ({ symbol, meaning }) => ({
    id: `attention-symbol-${symbol}`,
    term: symbol,
    definition: meaning,
  }),
);

const rootGuide: LearningGuidePage = {
  id: "decoder-guide-root",
  routeId: "decoder.root",
  title: "구조 설명",
  learningGoal: "Decoder-only Transformer의 전체 생성 흐름을 구분합니다.",
  introduction: [],
  sections: [
    {
      id: "root-structure",
      title: "",
      associatedNodeIds: rootAssociatedNodeIds,
      blocks: [
        {
          id: "root-structure-summary",
          kind: "bullets",
          items: [
            {
              id: "repeated-blocks",
              title: "Transformer Block",
              text: "동일한 Block이 모델의 layer 수만큼 순차적으로 적용됩니다.",
            },
            {
              id: "block-range",
              title: "반복 Block 범위",
              text: "LN1 · Causal Self-Attention · Residual Add · LN2 · MLP · Residual Add",
            },
            {
              id: "final-layer-norm",
              title: "Final LayerNorm",
              text: "반복 Block 바깥에서 마지막 hidden state를 정규화합니다.",
            },
          ],
        },
      ],
    },
  ],
  keyTakeaway: rootKeyTakeaway,
  glossary: ["attention-symbol-X"],
  nextStep: {
    routeId: "decoder.block",
    label: "Transformer Block",
  },
};

export const decoderBlockOperationIds = [
  "layer-norm-1",
  "self-attention",
  "residual-1",
  "layer-norm-2",
  "mlp",
  "residual-2",
] as const;

export const decoderBlockGuide: LearningGuidePage = {
  id: "decoder-guide-block",
  routeId: "decoder.block",
  title: "Transformer Block",
  learningGoal:
    "Pre-LN Decoder Block의 attention과 MLP residual 순서를 확인합니다.",
  introduction: [],
  sections: [
    {
      id: "block-operations",
      title: "",
      associatedNodeIds: [
        "decoder.block.layer-norm-1",
        "decoder.block.self-attention",
        "decoder.block.residual-1",
        "decoder.block.layer-norm-2",
        "decoder.block.mlp",
        "decoder.block.residual-2",
      ],
      blocks: [
        {
          id: "block-operation-steps",
          kind: "steps",
          items: decoderBlockOperationIds.map((id) => ({
            id,
            title: decoderNotationEntries[id].title,
          })),
        },
        ...decoderBlockOperationIds.map((formulaId) => ({
          id: `block-formula-${formulaId}`,
          kind: "formula" as const,
          formulaId,
        })),
      ],
    },
  ],
  keyTakeaway: blockKeyTakeaway,
  glossary: ["attention-symbol-X"],
  nextStep: {
    routeId: "decoder.self-attention",
    label: "Self-Attention",
  },
};

export const decoderAttentionOperationIds = [
  "attention-qkv-projection",
  "attention-query",
  "attention-key",
  "attention-value",
  "attention-scores",
  "attention-scale",
  "attention-causal-mask",
  "attention-softmax",
  "attention-value-aggregation",
  "attention-merge-heads",
  "attention-output-projection",
] as const;

export const decoderAttentionGuide: LearningGuidePage = {
  id: "decoder-guide-self-attention",
  routeId: "decoder.self-attention",
  title: "Self-Attention",
  learningGoal: "Causal Self-Attention의 기호, 모델값, 현재 연산을 연결합니다.",
  introduction: [
    {
      id: "attention-input-summary",
      kind: "paragraph",
      text: "선택한 Transformer Block의 LayerNorm 1 출력이 attention input입니다.",
    },
  ],
  sections: [
    {
      id: "attention-symbols",
      title: decoderAttentionGuideCopy.symbolsTitle,
      associatedNodeIds: [
        "decoder.attention.query",
        "decoder.attention.key",
        "decoder.attention.value",
      ],
      blocks: glossary.map(({ id }) => ({
        id: `attention-term-${id}`,
        kind: "term",
        termId: id,
      })),
    },
    {
      id: "attention-current-model",
      title: decoderAttentionGuideCopy.currentModelTitle,
      blocks: [],
    },
    {
      id: "attention-current-operation",
      title: decoderAttentionGuideCopy.currentOperationTitle,
      associatedNodeIds: attentionOperationNodeIds,
      blocks: [
        {
          id: "attention-summary-formula",
          kind: "formula",
          formulaId: "attention-summary",
        },
      ],
    },
  ],
  keyTakeaway: attentionKeyTakeaway,
  glossary: glossary.map(({ id }) => id),
};

export const decoderGuideCatalog: LearningGuideCatalog = {
  pages: {
    "decoder.root": rootGuide,
    "decoder.block": decoderBlockGuide,
    "decoder.self-attention": decoderAttentionGuide,
  },
  glossary,
};

export function decoderGuidePage(
  routeId: LearningRouteId,
  layerCount: number,
): LearningGuidePage {
  const page = decoderGuideCatalog.pages[routeId];
  if (page === undefined) throw new DecoderGuideError(routeId);
  if (routeId !== "decoder.root") return page;
  return {
    ...page,
    sections: page.sections.map((section) => ({
      ...section,
      blocks: section.blocks.map((block) =>
        block.kind !== "bullets"
          ? block
          : {
              ...block,
              items: block.items.map((item) =>
                item.id !== "repeated-blocks"
                  ? item
                  : {
                      ...item,
                      title: `Transformer Block × ${layerCount}`,
                      text: `동일한 Block이 ${layerCount}번 순차적으로 적용됩니다.`,
                    },
              ),
            },
      ),
    })),
  };
}
