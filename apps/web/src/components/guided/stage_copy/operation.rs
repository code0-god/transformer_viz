//! Architecture-level and operation Explore copy.

use super::{StageCopy, c};
use crate::app::architecture::{ArchitectureLevel, ArchitectureOperation};

pub(super) const fn level_copy(level: ArchitectureLevel) -> StageCopy {
    match level {
        ArchitectureLevel::Gpt => c(
            "GPT forward",
            "전체 예측 경로를 조망합니다.",
            "tokens → embedding → blocks → LN_f → logits",
            "노드를 선택해 실제 trace 경계를 탐색하세요.",
        ),
        ArchitectureLevel::Block => c(
            "Transformer Block",
            "attention, MLP와 residual 경로를 조망합니다.",
            "x → LN₁ → attention → +x → LN₂ → MLP → +",
            "블록 연산을 선택해 실제 경계를 확인하세요.",
        ),
        ArchitectureLevel::Attention => c(
            "Multi-head Attention",
            "선택한 head의 Q, K, V부터 projection까지 조망합니다.",
            "softmax(mask(QKᵀ/√dₕ))V",
            "head와 연산을 선택해 실제 trace를 확인하세요.",
        ),
        ArchitectureLevel::Generation => c(
            "Generation loop",
            "logits를 다음 토큰으로 바꾸고 전체 forward를 반복합니다.",
            "logits → temperature → top-k → sample → append → repeat",
            "생성 연산을 선택해 compact step을 확인하세요.",
        ),
    }
}

pub(in crate::components::guided) const fn operation_label(
    operation: ArchitectureOperation,
) -> &'static str {
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

pub(super) const fn operation_copy(operation: ArchitectureOperation) -> StageCopy {
    use ArchitectureOperation as O;
    match operation {
        O::Embedding => c(
            "Embedding",
            "토큰과 위치를 공통 residual 좌표에 놓습니다.",
            "x₀ = token_embedding + position_embedding",
            "세부 입력 경계는 Guided에서 확인하세요.",
        ),
        O::FinalLayerNorm => c(
            "Final LayerNorm",
            "마지막 residual 특징 규모를 정돈합니다.",
            "x̂=LN_f(x)",
            "다음 연산을 탐색하세요.",
        ),
        O::LanguageModelHead | O::Logits => c(
            operation_label(operation),
            "묶인 embedding 가중치로 어휘별 점수를 계산합니다.",
            "logits=x̂Wₑᵀ",
            "생성 경계를 계속 탐색하세요.",
        ),
        O::AttentionLayerNorm | O::MlpLayerNorm => c(
            operation_label(operation),
            "연산 입력의 특징 규모를 정규화합니다.",
            "x̂=LN(x)",
            "다음 블록 연산을 탐색하세요.",
        ),
        O::AttentionResidual | O::MlpResidual => c(
            "Residual",
            "연산 출력을 residual stream에 합칩니다.",
            "x′=x+f(x)",
            "다음 블록 연산을 탐색하세요.",
        ),
        O::Mlp => c(
            "MLP",
            "토큰별 특징을 비선형 변환합니다.",
            "GELU(xW₁)W₂",
            "출력 residual을 탐색하세요.",
        ),
        O::Query
        | O::Key
        | O::Value
        | O::QueryKeyProduct
        | O::Scale
        | O::Mask
        | O::Softmax
        | O::ValueProduct
        | O::MergeHeads
        | O::Projection => attention_copy(operation),
        O::Temperature | O::TopK | O::GenerationSoftmax | O::Sample | O::Append | O::Repeat => {
            generation_copy(operation)
        }
    }
}

const fn attention_copy(operation: ArchitectureOperation) -> StageCopy {
    use ArchitectureOperation as O;
    match operation {
        O::Query | O::Key | O::Value => c(
            operation_label(operation),
            "선택한 attention 투영을 확인합니다.",
            "Q,K,V=x̂W",
            "score와 value 경계를 탐색하세요.",
        ),
        O::QueryKeyProduct | O::Scale => c(
            operation_label(operation),
            "query-key 관련성 점수 경계를 확인합니다.",
            "S=QKᵀ/√dₕ",
            "mask를 탐색하세요.",
        ),
        O::Mask => c(
            "Mask",
            "미래 key를 차단합니다.",
            "j>i ⇒ −∞",
            "softmax를 탐색하세요.",
        ),
        O::Softmax => c(
            "Softmax",
            "허용된 key의 주의 비율을 정규화합니다.",
            "A=softmax(S)",
            "value 경계를 탐색하세요.",
        ),
        O::ValueProduct | O::MergeHeads | O::Projection => c(
            operation_label(operation),
            "value 결과를 residual 폭으로 모읍니다.",
            "concat(AV)Wₒ",
            "residual을 탐색하세요.",
        ),
        O::Embedding
        | O::FinalLayerNorm
        | O::LanguageModelHead
        | O::AttentionLayerNorm
        | O::AttentionResidual
        | O::MlpLayerNorm
        | O::Mlp
        | O::MlpResidual
        | O::Logits
        | O::Temperature
        | O::TopK
        | O::GenerationSoftmax
        | O::Sample
        | O::Append
        | O::Repeat => unreachable!(),
    }
}

const fn generation_copy(operation: ArchitectureOperation) -> StageCopy {
    use ArchitectureOperation as O;
    match operation {
        O::Temperature => c(
            "Temperature",
            "저장된 적용 온도로 logits를 조정합니다.",
            "z′=z/T",
            "Top-K를 탐색하세요.",
        ),
        O::TopK => c(
            "Top-K",
            "저장된 적용 k로 후보를 제한합니다.",
            "z″=keep_k(z′)",
            "sampling을 탐색하세요.",
        ),
        O::GenerationSoftmax => c(
            "Softmax",
            "필터링 후보를 compact 확률로 정규화합니다.",
            "p=softmax(z″)",
            "Sample을 탐색하세요.",
        ),
        O::Sample => c(
            "Sample",
            "저장된 모드와 draw로 ID를 선택합니다.",
            "id~categorical(p)",
            "Append를 탐색하세요.",
        ),
        O::Append => c(
            "Append",
            "선택 ID를 문맥에 붙입니다.",
            "context′=context⧺id",
            "Repeat를 탐색하세요.",
        ),
        O::Repeat => c(
            "Repeat",
            "늘어난 전체 문맥을 다시 계산합니다.",
            "context′→GPT(context′)",
            "다른 generation step을 탐색하세요.",
        ),
        O::Embedding
        | O::FinalLayerNorm
        | O::LanguageModelHead
        | O::AttentionLayerNorm
        | O::AttentionResidual
        | O::MlpLayerNorm
        | O::Mlp
        | O::MlpResidual
        | O::Query
        | O::Key
        | O::Value
        | O::QueryKeyProduct
        | O::Scale
        | O::Mask
        | O::Softmax
        | O::ValueProduct
        | O::MergeHeads
        | O::Projection
        | O::Logits => unreachable!(),
    }
}
