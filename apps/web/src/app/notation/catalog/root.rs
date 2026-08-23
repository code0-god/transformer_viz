//! Root Architecture and generation notation.

use super::NotationEntry;

pub(super) const ROOT_NOTATION: &[NotationEntry] = &[
    entry!(
        Root,
        "GPT",
        "X_N = Block_{N-1}(…Block₀(X₀))",
        "[T] → [T, Vocab]",
        "[T]",
        "[T, Vocab]",
        "GPT Architecture",
        "현재 context가 logits와 다음 token으로 변환되는 전체 경로입니다."
    ),
    entry!(
        InputContext,
        "Input Context",
        "tokens = [t₀, …, t_{T-1}]",
        "tokens [T]",
        "[T]",
        "[T]",
        "현재 input token sequence",
        "현재 forward pass에 입력되는 token ID sequence입니다."
    ),
    entry!(
        TokenEmbedding,
        "Token Embedding",
        "E_tok = W_E[tokens]",
        "[T] → [T, C]",
        "[T]",
        "[T, C]",
        "Token embedding lookup",
        "각 token ID를 model dimension C의 vector로 변환합니다."
    ),
    entry!(
        PositionEmbedding,
        "Position Embedding",
        "E_pos = W_P[0:T]",
        "[T] → [T, C]",
        "[T]",
        "[T, C]",
        "Position embedding lookup",
        "각 sequence position을 model dimension C의 vector로 변환합니다."
    ),
    entry!(
        EmbeddingAdd,
        "Embedding Add",
        "X₀ = E_tok + E_pos",
        "[T, C] + [T, C] → [T, C]",
        "[T, C] + [T, C]",
        "[T, C]",
        "Token과 Position embedding의 원소별 덧셈",
        "두 embedding을 원소별로 더해 초기 hidden state X₀를 만듭니다."
    ),
    entry!(
        HiddenState,
        "Hidden State X₀",
        "X₀ = E_tok + E_pos",
        "[T, C]",
        "[T, C]",
        "[T, C]",
        "초기 hidden state X zero",
        "모든 Transformer Block에 들어가는 초기 residual stream입니다."
    ),
    entry!(
        TransformerBlock,
        "Transformer Block",
        "X_N = Block_{N-1}(…Block₀(X₀))",
        "[T, C] → [T, C]",
        "[T, C]",
        "[T, C]",
        "반복 Transformer Blocks",
        "구성된 N개 Block을 순서대로 적용합니다."
    ),
    entry!(
        FinalLayerNorm,
        "Final LayerNorm",
        "X_final = LN_f(X_N)",
        "[T, C] → [T, C]",
        "[T, C]",
        "[T, C]",
        "Final LayerNorm",
        "모든 Block을 지난 hidden state X_N을 정규화합니다."
    ),
    entry!(
        LmHead,
        "LM Head",
        "L = Linear_vocab(X_final)",
        "Linear: [T, C] → [T, Vocab]",
        "[T, C]",
        "[T, Vocab]",
        "LM Head Linear projection",
        "Final hidden state를 vocabulary logits로 projection합니다."
    ),
    entry!(
        Logits,
        "Logits",
        "L",
        "L [T, Vocab]",
        "[T, Vocab]",
        "[T, Vocab]",
        "Vocabulary logits",
        "각 token position의 vocabulary score입니다."
    ),
    entry!(
        TokenSelection,
        "Token Selection",
        "i_next ~ Select(L_last)",
        "[Vocab] → [1]",
        "[Vocab]",
        "[1]",
        "다음 token 선택",
        "마지막 position logits에서 다음 token ID를 선택합니다."
    ),
    entry!(
        GeneratedToken,
        "Generated Token",
        "t_next = decode(i_next)",
        "token [1]",
        "[1]",
        "[1]",
        "생성된 token",
        "선택한 token ID를 text piece로 decode합니다."
    ),
    entry!(
        AppendContext,
        "Append to Context",
        "tokens′ = tokens ⧺ i_next",
        "[T], [1] → [T+1]",
        "[T], [1]",
        "[T+1]",
        "생성 token을 context에 추가",
        "다음 forward pass를 위해 생성 token을 context 끝에 추가합니다."
    ),
];
