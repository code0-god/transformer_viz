//! Self-Attention notation.

use super::NotationEntry;

pub(super) const ATTENTION_NOTATION: &[NotationEntry] = &[
    entry!(
        AttentionQkvProjection,
        "QKV Projection",
        "Z_qkv = Linear_qkv(X)",
        "Linear: [T, C] → [T, 3C]",
        "[T, C]",
        "[T, 3C]",
        "QKV Projection, 하나의 Linear layer",
        "하나의 Linear C to 3C 연산이 combined tensor Z_qkv를 만듭니다."
    ),
    entry!(
        AttentionQuery,
        "Query Q",
        "Q = Split_Q(Z_qkv)",
        "Q [T, C]",
        "[T, 3C]",
        "[T, C]",
        "Query tensor Q",
        "Combined QKV tensor에서 Query tensor를 분리합니다."
    ),
    entry!(
        AttentionKey,
        "Key K",
        "K = Split_K(Z_qkv)",
        "K [T, C]",
        "[T, 3C]",
        "[T, C]",
        "Key tensor K",
        "Combined QKV tensor에서 Key tensor를 분리합니다."
    ),
    entry!(
        AttentionValue,
        "Value V",
        "V = Split_V(Z_qkv)",
        "V [T, C]",
        "[T, 3C]",
        "[T, C]",
        "Value tensor V",
        "Combined QKV tensor에서 Value tensor를 분리합니다."
    ),
    entry!(
        AttentionScores,
        "Score MatMul",
        "S_h = Q_h @ K_hᵀ",
        "S_h = Q_h @ K_hᵀ",
        "[T, D] @ [D, T]",
        "[T, T]",
        "Score MatMul, Query와 전치된 Key의 행렬곱",
        "선택한 head의 Query와 전치된 Key를 행렬곱해 attention score를 만듭니다."
    ),
    entry!(
        AttentionScale,
        "Scale",
        "S_h^scaled = S_h / √D",
        "S_h / √D",
        "[T, T]",
        "[T, T]",
        "Scale, score를 head dimension 제곱근으로 나누기",
        "Score를 head dimension의 제곱근으로 나눕니다."
    ),
    entry!(
        AttentionCausalMask,
        "Causal Mask",
        "S_h^masked = CausalMask(S_h^scaled)",
        "future positions blocked",
        "[T, T]",
        "[T, T]",
        "Causal Mask, 미래 token position 차단",
        "j가 i보다 큰 미래 위치의 score를 차단합니다."
    ),
    entry!(
        AttentionSoftmax,
        "Softmax",
        "A_h = softmax(S_h^masked)",
        "A_h = softmax(S_h^masked)",
        "[T, T]",
        "[T, T]",
        "Softmax, attention probability 정규화",
        "허용된 score를 attention probability A_h로 정규화합니다."
    ),
    entry!(
        AttentionValueAggregation,
        "Value MatMul",
        "Y_h = A_h @ V_h",
        "Y_h = A_h @ V_h",
        "[T, T] @ [T, D]",
        "[T, D]",
        "Value MatMul, attention probability와 Value의 행렬곱",
        "Attention probability와 Value를 행렬곱해 head output Y_h를 만듭니다."
    ),
    entry!(
        AttentionMergeHeads,
        "Merge Heads",
        "Y_merge = Concat(Y_0, …, Y_{H-1})",
        "[H, T, D] → [T, C]",
        "[H, T, D]",
        "[T, C]",
        "Merge Heads, head output 연결과 reshape",
        "Head output을 더하지 않고 Concat한 뒤 model dimension C로 reshape합니다."
    ),
    entry!(
        AttentionOutputProjection,
        "Output Projection",
        "Y_attn = Linear_out(Y_merge)",
        "Linear: [T, C] → [T, C]",
        "[T, C]",
        "[T, C]",
        "Output Projection, Linear C to C",
        "c_proj Linear layer가 최종 attention output Y_attn을 만듭니다."
    ),
];
