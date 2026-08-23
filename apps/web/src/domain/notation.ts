import type { ArchitectureNodeId } from "../architecture/catalog";
import { attentionNotation } from "./attentionNotation";
import { blockNotation } from "./blockNotation";
import type { NotationEntry } from "./notationTypes";
import { rootNotation } from "./rootNotation";

export type { NotationEntry } from "./notationTypes";

export const notationCatalog: Readonly<
  Record<ArchitectureNodeId, NotationEntry>
> = {
  ...rootNotation,
  ...blockNotation,
  ...attentionNotation,
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

export const ATTENTION_SYMBOLS: readonly SymbolDefinition[] = [
  { symbol: "T", meaning: "현재 sequence length" },
  { symbol: "C", meaning: "model dimension" },
  { symbol: "H", meaning: "attention head 수" },
  { symbol: "D", meaning: "head dimension, C / H" },
  { symbol: "h", meaning: "선택한 head index" },
  { symbol: "i", meaning: "Query token position" },
  { symbol: "j", meaning: "Key token position" },
  { symbol: "X", meaning: "Attention input, X_LN1" },
  { symbol: "Q / K / V", meaning: "Query, Key, Value" },
  { symbol: "S_h", meaning: "선택한 head의 attention scores" },
  { symbol: "A_h", meaning: "선택한 head의 attention probabilities" },
  { symbol: "Y_h", meaning: "선택한 head의 output" },
];

export const ATTENTION_SUMMARY =
  "Y_h = softmax(CausalMask(Q_h @ K_hᵀ / √D)) @ V_h";
export const ATTENTION_VALUE_CAPTION =
  "V_h는 score 계산에 참여하지 않고, Softmax 이후 Value MatMul에서 A_h와 결합합니다.";
