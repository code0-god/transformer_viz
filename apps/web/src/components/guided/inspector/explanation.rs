//! Stage-specific Korean explanation without duplicating the primary diagram.

use leptos::prelude::*;

use crate::app::{narrative::NarrativeStage, state::AppState};

use super::super::{
    stage_copy::{focus_bridge, focus_formula, focus_purpose, focus_title},
    visuals::generation_sampling,
};

pub(super) fn panel(state: &AppState) -> AnyView {
    let evidence = generation_sampling::explanation(state).unwrap_or_else(|| {
        state.ui.architecture.operation.map_or(
            "연산을 선택하기 전에는 level 구조와 모델 설정만 표시합니다.",
            |operation| {
                if operation.retained_detail_indices().is_empty() {
                    "이 경계에는 연결된 trace tensor ID가 없습니다."
                } else {
                    evidence_prompt(state.ui.narrative.stage)
                }
            },
        )
    });
    view! {
        <article class="inspector-copy" data-testid="inspector-explanation">
            <h3>{focus_title(state)}</h3>
            <p class="explanation-purpose">{focus_purpose(state)}</p>
            <dl>
                <div><dt>"계산"</dt><dd><code>{focus_formula(state)}</code></dd></div>
                <div><dt>"지금 확인할 실제 증거"</dt><dd>{evidence}</dd></div>
                <div><dt>"다음 연결"</dt><dd>{focus_bridge(state)}</dd></div>
            </dl>
        </article>
    }
    .into_any()
}

const fn evidence_prompt(stage: NarrativeStage) -> &'static str {
    match stage {
        NarrativeStage::Tokenization => "실제 token ID와 표시 문자열의 경계를 확인하세요.",
        NarrativeStage::TokenEmbedding => "선택 token의 학습된 embedding feature를 확인하세요.",
        NarrativeStage::PositionEmbedding => "같은 위치의 position embedding feature를 확인하세요.",
        NarrativeStage::LayerNorm => {
            "정규화 전후의 shape와 평균·표준편차, 선택 feature 값을 확인하세요."
        }
        NarrativeStage::QueryKeyValue => {
            "같은 입력이 Q·K·V의 서로 다른 값이 되는지, q token과 k token 주소를 구분해 보세요."
        }
        NarrativeStage::AttentionScore => {
            "16개 QᵢKᵢ 곱의 합이 captured raw score와 맞고 √D scaling 오차가 작은지 확인하세요."
        }
        NarrativeStage::CausalMask => {
            "선택 q보다 뒤의 k가 hatch로 차단되고 실제 mask 허용값과 일치하는지 확인하세요."
        }
        NarrativeStage::Softmax => {
            "선택 query의 전체 확률 합이 1이고 미래 key 확률이 0인지 확인하세요."
        }
        NarrativeStage::ValueAggregation => {
            "모든 key별 feature A_h @ V_h 합이 captured attention output과 일치하는지 확인하세요."
        }
        NarrativeStage::Residual => {
            "attention projection과 residual 합의 실제 tensor 경계를 확인하세요."
        }
        NarrativeStage::Mlp => "LN₂, 4C 확장, exact GELU와 C projection 경계를 확인하세요.",
        NarrativeStage::BlockOutput => "MLP residual 합이 다음 블록 입력과 이어지는지 확인하세요.",
        NarrativeStage::FinalLayerNorm => "실제 final LayerNorm tensor의 shape와 값을 확인하세요.",
        NarrativeStage::LanguageModelHead | NarrativeStage::Logits => {
            "tied embedding head가 만든 전체 vocabulary logits를 확인하세요."
        }
        NarrativeStage::Temperature
        | NarrativeStage::TopK
        | NarrativeStage::Sampling
        | NarrativeStage::GeneratedToken
        | NarrativeStage::AppendToContext
        | NarrativeStage::Repeat => "선택한 generated step의 compact summary 경계를 확인하세요.",
    }
}
