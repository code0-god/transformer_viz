//! Canonical 21-step Guided copy.

use super::{StageCopy, c};
use crate::app::narrative::NarrativeStage;

const STAGE_COPY: [StageCopy; 21] = [
    c(
        "Tokenization",
        "입력 문자열을 실제 tokenizer의 토큰 ID 경계로 나눕니다.",
        "text → token_ids",
        "다음: 각 토큰 ID의 학습된 벡터를 읽습니다.",
    ),
    c(
        "Token Embedding",
        "각 토큰 ID를 residual 폭의 학습된 의미 벡터로 바꿉니다.",
        "t = Wₑ[token_id]",
        "다음: 같은 벡터에 위치 정보를 더합니다.",
    ),
    c(
        "Position Embedding",
        "토큰 순서를 나타내는 학습된 위치 벡터를 더합니다.",
        "x₀ = t + Wₚ[position]",
        "다음: 블록이 읽기 좋은 규모로 정규화합니다.",
    ),
    c(
        "LayerNorm",
        "특징의 규모를 맞춰 attention 입력을 안정화합니다.",
        "x̂ = LN₁(x₀)",
        "다음: 정규화된 입력에서 Q, K, V를 만듭니다.",
    ),
    c(
        "Q/K/V",
        "찾을 정보, 검색 표지, 전달할 내용을 각각 투영합니다.",
        "Q=x̂Wq · K=x̂Wk · V=x̂Wv",
        "다음: query와 key의 내적으로 관련성을 계산합니다.",
    ),
    c(
        "Attention Score",
        "각 query-key 쌍의 관련성을 head 폭에 맞춰 조정합니다.",
        "S = QKᵀ / √dₕ",
        "다음: 미래 위치를 차단합니다.",
    ),
    c(
        "Causal Mask",
        "현재 토큰이 미래 key를 참고하지 못하게 제한합니다.",
        "S′ᵢⱼ = Sᵢⱼ if j≤i, else −∞",
        "다음: 허용된 점수를 확률로 바꿉니다.",
    ),
    c(
        "Softmax",
        "허용된 key 사이의 주의 비율을 정규화합니다.",
        "A = softmax(S′)",
        "다음: 확률로 value 정보를 모읍니다.",
    ),
    c(
        "Value Aggregation",
        "선택한 head에서 attention 확률로 value를 가중합합니다.",
        "H = AV",
        "다음: attention 결과를 residual stream에 더합니다.",
    ),
    c(
        "Residual",
        "attention 출력을 원래 정보 흐름에 다시 더합니다.",
        "x₁ = x₀ + concat(H)Wₒ",
        "다음: 토큰별 비선형 특징 변환을 수행합니다.",
    ),
    c(
        "MLP",
        "각 토큰의 특징을 확장하고 비선형 변환한 뒤 되돌립니다.",
        "m = GELU(LN₂(x₁)W₁)W₂",
        "다음: 변환 결과가 블록 출력에 합쳐집니다.",
    ),
    c(
        "Block Output",
        "MLP 결과를 더해 다음 블록으로 보낼 residual을 완성합니다.",
        "x₂ = x₁ + m",
        "다음: 모든 블록 뒤 최종 정규화를 적용합니다.",
    ),
    c(
        "Final LayerNorm",
        "마지막 residual stream의 특징 규모를 정돈합니다.",
        "x̂ = LN_f(x)",
        "다음: 묶인 embedding 가중치로 어휘를 읽습니다.",
    ),
    c(
        "LM Head",
        "최종 표현을 어휘 공간에 투영합니다.",
        "z = x̂Wₑᵀ",
        "다음: 실제 어휘별 raw logits를 확인합니다.",
    ),
    c(
        "Logits",
        "다음 토큰 후보 각각의 필터링 전 점수를 보존합니다.",
        "logits = z[last_position]",
        "다음: temperature로 상대적 선명도를 조정합니다.",
    ),
    c(
        "Temperature",
        "샘플링 전 logits의 상대적 선명도를 조정합니다.",
        "z′ = z / temperature",
        "다음: Top-K 후보 집합을 제한합니다.",
    ),
    c(
        "Top-K",
        "가장 높은 k개 후보만 샘플링 집합에 남깁니다.",
        "z″ = keep_k(z′)",
        "다음: 후보를 확률화하고 하나를 선택합니다.",
    ),
    c(
        "Sampling",
        "필터링된 후보 분포와 저장된 draw로 다음 ID를 선택합니다.",
        "p=softmax(z″); id~categorical(p)",
        "다음: 선택 결과를 별도의 생성 토큰으로 확인합니다.",
    ),
    c(
        "Generated Token",
        "샘플링이 결정한 정확한 token ID와 표시 문자열을 확인합니다.",
        "generated = tokenizer.decode(id)",
        "다음: 이 토큰을 pre-selection 문맥 끝에 붙입니다.",
    ),
    c(
        "Append to Context",
        "선택한 토큰을 다음 forward의 문맥 끝에 붙입니다.",
        "context′ = context ⧺ generated",
        "다음: 늘어난 전체 prefix를 다시 계산합니다.",
    ),
    c(
        "Repeat",
        "KV cache 없이 늘어난 전체 문맥으로 GPT forward를 반복합니다.",
        "context′ → GPT(context′)",
        "완료: 생성된 다른 step을 선택해 같은 경계를 검증하세요.",
    ),
];

pub(in crate::components::guided) const fn stage_copy(stage: NarrativeStage) -> StageCopy {
    STAGE_COPY[stage.index()]
}
