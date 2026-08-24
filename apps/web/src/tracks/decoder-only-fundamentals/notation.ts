import type { ArchitectureNodeId } from "../../architecture/catalog";
import { attentionNotation } from "../../domain/attentionNotation";
import { blockNotation } from "../../domain/blockNotation";
import type { NotationEntry } from "../../domain/notationTypes";
import { rootNotation } from "../../domain/rootNotation";

export type { NotationEntry } from "../../domain/notationTypes";

export const decoderNotationEntries: Readonly<
  Record<ArchitectureNodeId, NotationEntry>
> = {
  ...rootNotation,
  ...blockNotation,
  ...attentionNotation,
  "attention-softmax": {
    ...attentionNotation["attention-softmax"],
    description:
      "허용된 score를 선택한 head의 attention probability로 정규화합니다.",
  },
};

export function repeatedBlockLabel(layerCount: number): string {
  return `Transformer Block × ${layerCount}`;
}

export function symbolicShape(entry: NotationEntry): string {
  return entry.symbolicInput === entry.symbolicOutput
    ? entry.symbolicOutput
    : `${entry.symbolicInput} → ${entry.symbolicOutput}`;
}

export interface SymbolDefinition {
  readonly symbol: string;
  readonly meaning: string;
}

export const decoderAttentionSymbols: readonly SymbolDefinition[] = [
  { symbol: "T", meaning: "현재 sequence length" },
  { symbol: "C", meaning: "model dimension" },
  { symbol: "H", meaning: "attention head 수" },
  { symbol: "D", meaning: "model dimension을 head 수로 나눈 값" },
  { symbol: "h", meaning: "선택한 head index" },
  { symbol: "i", meaning: "Query token position" },
  { symbol: "j", meaning: "Key token position" },
  { symbol: "X", meaning: "LayerNorm 1에서 나온 attention input" },
  { symbol: "Q / K / V", meaning: "Query, Key, Value" },
  { symbol: "S_h", meaning: "선택한 head의 attention scores" },
  { symbol: "A_h", meaning: "선택한 head의 attention probabilities" },
  { symbol: "Y_h", meaning: "선택한 head의 output" },
];

export const decoderAttentionSummary =
  "Y_h = softmax(CausalMask(Q_h @ K_hᵀ / √D)) @ V_h";
