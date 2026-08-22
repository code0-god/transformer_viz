//! Typed copy for narrative stages and architecture focus.

use crate::app::{
    architecture::{ArchitectureLevel, ArchitectureOperation},
    narrative::NarrativeStage,
    state::AppState,
};

#[derive(Clone, Copy)]
pub(super) struct StageCopy {
    pub title: &'static str,
    pub purpose: &'static str,
    pub formula: &'static str,
    pub bridge: &'static str,
}

const STAGE_COPY: [StageCopy; 9] = [
    StageCopy {
        title: "임베딩",
        purpose: "토큰과 위치 정보를 같은 residual stream에 놓습니다.",
        formula: "x₀ = token_embedding + position_embedding",
        bridge: "다음: 어텐션이 읽기 좋은 규모로 입력을 정규화합니다.",
    },
    StageCopy {
        title: "Attention LayerNorm",
        purpose: "특징의 규모를 맞춰 어텐션 입력을 안정화합니다.",
        formula: "x̂ = LN₁(x₀)",
        bridge: "다음: 정규화된 입력에서 Q, K, V를 만듭니다.",
    },
    StageCopy {
        title: "Q/K/V",
        purpose: "찾을 정보, 제공할 표지, 전달할 내용을 각각 투영합니다.",
        formula: "Q = x̂Wq · K = x̂Wk · V = x̂Wv",
        bridge: "다음: query와 key의 내적으로 관련성 점수를 계산합니다.",
    },
    StageCopy {
        title: "Attention Score",
        purpose: "각 query-key 쌍의 원시 관련성을 head 폭에 맞춰 조정합니다.",
        formula: "S = QKᵀ / √dₕ",
        bridge: "다음: 아직 보지 못한 미래 위치를 차단합니다.",
    },
    StageCopy {
        title: "Causal Mask",
        purpose: "현재 토큰이 미래 key를 참고하지 못하게 제한합니다.",
        formula: "S′ᵢⱼ = Sᵢⱼ if j ≤ i, else −∞",
        bridge: "다음: 허용된 점수를 합이 1인 확률로 바꿉니다.",
    },
    StageCopy {
        title: "Softmax",
        purpose: "허용된 key 사이의 주의 비율을 확률로 정규화합니다.",
        formula: "A = softmax(S′)",
        bridge: "다음: 확률을 사용해 실제 value 정보를 모읍니다.",
    },
    StageCopy {
        title: "Value + Residual",
        purpose: "value 가중합을 원래 정보 흐름에 다시 더합니다.",
        formula: "x₁ = x₀ + concat(AV)Wₒ",
        bridge: "다음: MLP가 토큰별 특징을 확장하고 다시 합칩니다.",
    },
    StageCopy {
        title: "MLP + Residual",
        purpose: "비선형 특징 변환을 거친 출력을 residual stream에 더합니다.",
        formula: "x₂ = x₁ + GELU(LN₂(x₁)W₁)W₂",
        bridge: "다음: 최종 표현을 어휘 전체의 예측 점수로 읽습니다.",
    },
    StageCopy {
        title: "Prediction",
        purpose: "최종 표현을 실제 어휘 logits와 다음 토큰 확률로 변환합니다.",
        formula: "p(token) = softmax(LN_f(x)Wₑᵀ)",
        bridge: "완료: 다른 토큰과 좌표를 선택해 같은 경로를 다시 검증해 보세요.",
    },
];

pub(super) const fn stage_copy(stage: NarrativeStage) -> StageCopy {
    STAGE_COPY[stage.index()]
}

pub(super) fn focus_title(state: &AppState) -> &'static str {
    state.ui.architecture.operation.map_or_else(
        || level_copy(state.ui.architecture.level).title,
        operation_label,
    )
}

pub(super) fn focus_purpose(state: &AppState) -> &'static str {
    state.ui.architecture.operation.map_or_else(
        || level_copy(state.ui.architecture.level).purpose,
        operation_purpose,
    )
}

pub(super) fn focus_formula(state: &AppState) -> &'static str {
    state.ui.architecture.operation.map_or_else(
        || level_copy(state.ui.architecture.level).formula,
        operation_formula,
    )
}

pub(super) fn focus_bridge(state: &AppState) -> &'static str {
    state.ui.architecture.operation.map_or_else(
        || level_copy(state.ui.architecture.level).bridge,
        operation_bridge,
    )
}

const fn level_copy(level: ArchitectureLevel) -> StageCopy {
    match level {
        ArchitectureLevel::Gpt => StageCopy {
            title: "GPT forward",
            purpose: "임베딩부터 묶인 LM Head까지 전체 예측 경로를 조망합니다.",
            formula: "tokens → embedding → blocks → LN_f → logits",
            bridge: "아키텍처 노드를 선택하면 해당 연산과 실제 trace가 연결됩니다.",
        },
        ArchitectureLevel::Block => StageCopy {
            title: "Transformer Block",
            purpose: "선택한 블록의 attention, MLP, 두 residual 경로를 조망합니다.",
            formula: "x → LN₁ → attention → +x → LN₂ → MLP → +",
            bridge: "Attention 또는 블록 연산을 선택해 실제 경계를 확인하세요.",
        },
        ArchitectureLevel::Attention => StageCopy {
            title: "Multi-head Attention",
            purpose: "선택한 head의 Q, K, V부터 projection까지의 경로를 조망합니다.",
            formula: "softmax(mask(QKᵀ/√dₕ))V → concat → projection",
            bridge: "head와 연산을 선택하면 공유 좌표와 실제 trace가 함께 바뀝니다.",
        },
        ArchitectureLevel::Generation => StageCopy {
            title: "Generation loop",
            purpose: "logits를 다음 토큰으로 바꾸고 문맥에 붙여 전체 forward를 반복합니다.",
            formula: "logits → temperature → top-k → softmax → sample → append → repeat",
            bridge: "샘플링 trace가 없는 경계는 구조와 설정만 정확히 표시합니다.",
        },
    }
}

pub(super) const fn operation_label(operation: ArchitectureOperation) -> &'static str {
    use ArchitectureOperation as O;
    match operation {
        O::Embedding => "Embedding",
        O::FinalLayerNorm => "Final LayerNorm",
        O::LanguageModelHead => "Tied LM Head",
        O::AttentionLayerNorm => "LN1",
        O::AttentionResidual | O::MlpResidual => "Residual",
        O::MlpLayerNorm => "LN2",
        O::Mlp => "MLP",
        O::Query => "Q",
        O::Key => "K",
        O::Value => "V",
        O::QueryKeyProduct => "QKᵀ",
        O::Scale => "Scale",
        O::Mask => "Mask",
        O::Softmax | O::GenerationSoftmax => "Softmax",
        O::ValueProduct => "×V",
        O::MergeHeads => "Merge Heads",
        O::Projection => "Projection",
        O::Logits => "Logits",
        O::Temperature => "Temperature",
        O::TopK => "Top-K",
        O::Sample => "Sample",
        O::Append => "Append",
        O::Repeat => "Repeat",
    }
}

const fn operation_formula(operation: ArchitectureOperation) -> &'static str {
    use ArchitectureOperation as O;
    match operation {
        O::Embedding => "x₀ = token_embedding + position_embedding",
        O::FinalLayerNorm => "x̂ = LN_f(x)",
        O::LanguageModelHead | O::Logits => "logits = x̂Wₑᵀ",
        O::AttentionLayerNorm => "x̂ = LN₁(x)",
        O::AttentionResidual => "x₁ = x + attention(x̂)",
        O::MlpLayerNorm => "m̂ = LN₂(x₁)",
        O::Mlp => "m = GELU(m̂W₁)W₂",
        O::MlpResidual => "x₂ = x₁ + m",
        O::Query => "Q = x̂Wq",
        O::Key => "K = x̂Wk",
        O::Value => "V = x̂Wv",
        O::QueryKeyProduct => "S = QKᵀ",
        O::Scale => "S′ = S / √dₕ",
        O::Mask => "S″ᵢⱼ = S′ᵢⱼ if j ≤ i, else −∞",
        O::Softmax => "A = softmax(S″)",
        O::ValueProduct => "H = AV",
        O::MergeHeads => "M = concat(H₀ … Hₙ)",
        O::Projection => "P = MWₒ",
        O::Temperature => "z′ = z / temperature",
        O::TopK => "z″ = keep_k(z′)",
        O::GenerationSoftmax => "p = softmax(z″)",
        O::Sample => "token ~ categorical(p)",
        O::Append => "context′ = context ⧺ token",
        O::Repeat => "context′ → GPT(context′)",
    }
}

const fn operation_purpose(operation: ArchitectureOperation) -> &'static str {
    use ArchitectureOperation as O;
    match operation {
        O::Embedding => "토큰과 위치를 residual stream의 공통 좌표에 놓습니다.",
        O::FinalLayerNorm => "마지막 residual stream의 특징 규모를 정돈합니다.",
        O::LanguageModelHead | O::Logits => "묶인 임베딩 가중치로 어휘별 점수를 계산합니다.",
        O::AttentionLayerNorm => "어텐션이 읽기 전에 블록 입력을 정규화합니다.",
        O::AttentionResidual => "어텐션 출력을 원래 residual stream에 더합니다.",
        O::MlpLayerNorm => "MLP가 읽기 전에 두 번째 정규화를 적용합니다.",
        O::Mlp => "각 토큰의 특징을 확장하고 비선형 변환한 뒤 되돌립니다.",
        O::MlpResidual => "MLP 출력을 residual stream에 합칩니다.",
        O::Query => "현재 위치가 찾는 특징을 투영합니다.",
        O::Key => "각 위치가 제공하는 검색 표지를 투영합니다.",
        O::Value => "주의 비율로 전달할 내용을 투영합니다.",
        O::QueryKeyProduct => "query와 key의 내적으로 관련성 점수를 만듭니다.",
        O::Scale => "head 폭에 따라 점수 크기를 조정합니다.",
        O::Mask => "미래 위치를 읽지 못하도록 차단합니다.",
        O::Softmax => "허용된 key의 점수를 주의 비율로 정규화합니다.",
        O::ValueProduct => "주의 비율로 value를 가중합합니다.",
        O::MergeHeads => "각 head의 출력을 residual 폭으로 이어 붙입니다.",
        O::Projection => "병합한 head를 residual stream 좌표로 투영합니다.",
        O::Temperature => "샘플링 전 logits의 상대적 선명도를 조정합니다.",
        O::TopK => "가장 높은 k개 후보만 샘플링 집합에 남깁니다.",
        O::GenerationSoftmax => "필터링된 logits를 샘플링 분포로 정규화합니다.",
        O::Sample => "설정된 모드와 seed로 다음 토큰을 선택합니다.",
        O::Append => "선택한 토큰을 다음 forward의 문맥 끝에 붙입니다.",
        O::Repeat => "늘어난 전체 문맥으로 GPT forward를 다시 실행합니다.",
    }
}

const fn operation_bridge(operation: ArchitectureOperation) -> &'static str {
    if matches!(operation, ArchitectureOperation::Repeat) {
        "이 모델은 KV cache 없이 늘어난 전체 문맥을 다시 계산합니다."
    } else if operation.target().is_none() {
        "이 경계는 설정과 수식만 표시하며 존재하지 않는 trace 값을 만들지 않습니다."
    } else {
        "Architecture Map 또는 학습 경로에서 연결된 실제 연산을 계속 탐색하세요."
    }
}
