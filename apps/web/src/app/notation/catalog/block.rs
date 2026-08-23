//! Transformer Block notation.

use super::NotationEntry;

pub(super) const BLOCK_NOTATION: &[NotationEntry] = &[
    entry!(
        LayerNorm1,
        "LayerNorm 1",
        "X_LN1 = LN1(X_in)",
        "X_LN1 = LN1(X_in)",
        "[T, C]",
        "[T, C]",
        "LayerNorm 1, Block 입력 정규화",
        "Block 입력 X_in을 attention 계산 전에 정규화합니다."
    ),
    entry!(
        SelfAttention,
        "Causal Multi-Head Self-Attention",
        "Y_attn = Attention(X_LN1)",
        "Y_attn = Attention(X_LN1)",
        "[T, C]",
        "[T, C]",
        "Causal Multi-Head Self-Attention",
        "정규화된 입력에서 causal attention output Y_attn을 계산합니다."
    ),
    entry!(
        Residual1,
        "Residual 1",
        "X_res1 = X_in + Y_attn",
        "X_res1 = X_in + Y_attn",
        "[T, C] + [T, C]",
        "[T, C]",
        "첫 번째 residual 덧셈",
        "Block 입력과 attention output을 원소별로 더합니다."
    ),
    entry!(
        LayerNorm2,
        "LayerNorm 2",
        "X_LN2 = LN2(X_res1)",
        "X_LN2 = LN2(X_res1)",
        "[T, C]",
        "[T, C]",
        "LayerNorm 2, 첫 residual 결과 정규화",
        "첫 residual 결과를 MLP 계산 전에 정규화합니다."
    ),
    entry!(
        Mlp,
        "MLP",
        "Y_MLP = MLP(X_LN2)",
        "Y_MLP = MLP(X_LN2)",
        "[T, C]",
        "[T, C]",
        "MLP feed-forward network",
        "정규화된 residual stream을 position-wise MLP로 변환합니다."
    ),
    entry!(
        Residual2,
        "Residual 2",
        "X_out = X_res1 + Y_MLP",
        "X_out = X_res1 + Y_MLP",
        "[T, C] + [T, C]",
        "[T, C]",
        "두 번째 residual 덧셈",
        "첫 residual 결과와 MLP output을 원소별로 더합니다."
    ),
];
