//! Canonical state labels and symbol definitions.

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct SymbolDefinition {
    pub(crate) symbol: &'static str,
    pub(crate) meaning: &'static str,
    attention_panel: bool,
}

#[cfg(test)]
pub(crate) const ROOT_HIDDEN_INPUT: &str = "Hidden State X₀";
pub(crate) const ROOT_HIDDEN_OUTPUT: &str = "Hidden State X_N";
pub(crate) const ROOT_HIDDEN_SHAPE: &str = "[T, C]";
pub(crate) const BLOCK_INPUT_TITLE: &str = "Block Input";
pub(crate) const BLOCK_INPUT_DETAIL: &str = "X_in [T, C]";
pub(crate) const BLOCK_RESIDUAL_1_TITLE: &str = "Residual 1";
#[cfg(test)]
pub(crate) const BLOCK_RESIDUAL_1_SYMBOL: &str = "X_res1";
pub(crate) const BLOCK_RESIDUAL_1_DETAIL: &str = "X_res1 = X_in + Y_attn";
pub(crate) const BLOCK_OUTPUT_TITLE: &str = "Block Output";
#[cfg(test)]
pub(crate) const BLOCK_OUTPUT_SYMBOL: &str = "X_out";
pub(crate) const BLOCK_OUTPUT_DETAIL: &str = "X_out = X_res1 + Y_MLP";
pub(crate) const ATTENTION_INPUT_TITLE: &str = "Attention Input X";
pub(crate) const ATTENTION_INPUT_DETAIL: &str = "[T, C]";
pub(crate) const ATTENTION_INPUT_DEFINITION: &str =
    "X는 선택한 Transformer Block의 LayerNorm 1 출력 X_LN1입니다.";
pub(crate) const SPLIT_HEADS_TITLE: &str = "Split Heads";
pub(crate) const SPLIT_HEADS_DETAIL: &str = "[T, C] → [H, T, D]";
pub(crate) const VALUE_HEAD_EDGE_LABEL: &str = "V_h [T, D]";
pub(crate) const HEAD_OUTPUT_TITLE: &str = "Head Outputs";
pub(crate) const HEAD_OUTPUT_DETAIL: &str = "Y [H, T, D]";
pub(crate) const ATTENTION_OUTPUT_TITLE: &str = "Attention Output";
pub(crate) const ATTENTION_OUTPUT_DETAIL: &str = "Y_attn [T, C]";
pub(crate) const ATTENTION_VALUE_CAPTION: &str =
    "V_h는 score 계산에 참여하지 않고, Softmax 이후 Value MatMul에서 A_h와 결합합니다.";
pub(crate) const ATTENTION_SUMMARY: &str = "Y_h = softmax(CausalMask(Q_h @ K_hᵀ / √D)) @ V_h";

const SYMBOL_DEFINITIONS: &[SymbolDefinition] = &[
    symbol("N", "Transformer Block 수", false),
    symbol("B", "batch size", false),
    symbol("T", "현재 sequence length", true),
    symbol("C", "model dimension", true),
    symbol("H", "attention head 수", true),
    symbol("D", "head dimension, C / H", true),
    symbol("Vocab", "vocabulary size", false),
    symbol("h", "선택한 head index", true),
    symbol("i", "Query token position", true),
    symbol("j", "Key token position", true),
    symbol("k", "Top-k candidate count", false),
    symbol("τ", "temperature", false),
    symbol("X", "Attention input, X_LN1", true),
    symbol("Q / K / V", "Query, Key, Value", true),
    symbol("S_h", "선택한 head의 attention scores", true),
    symbol("A_h", "선택한 head의 attention probabilities", true),
    symbol("Y_h", "선택한 head의 output", true),
];

const fn symbol(
    symbol: &'static str,
    meaning: &'static str,
    attention_panel: bool,
) -> SymbolDefinition {
    SymbolDefinition {
        symbol,
        meaning,
        attention_panel,
    }
}

pub(crate) fn attention_symbol_definitions() -> impl Iterator<Item = &'static SymbolDefinition> {
    SYMBOL_DEFINITIONS
        .iter()
        .filter(|definition| definition.attention_panel)
}
