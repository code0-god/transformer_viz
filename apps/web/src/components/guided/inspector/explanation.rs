//! Stage-specific Korean explanation without duplicating the primary diagram.

use leptos::prelude::*;

use crate::app::{narrative::NarrativeStage, state::AppState};

use super::super::stage::stage_copy;

pub(super) fn panel(state: &AppState) -> AnyView {
    let copy = stage_copy(state.ui.narrative.stage);
    let evidence = evidence_prompt(state.ui.narrative.stage);
    view! {
        <article class="inspector-copy" data-testid="inspector-explanation">
            <h3>{copy.title}</h3>
            <p class="explanation-purpose">{copy.purpose}</p>
            <dl>
                <div><dt>"계산"</dt><dd><code>{copy.formula}</code></dd></div>
                <div><dt>"지금 확인할 실제 증거"</dt><dd>{evidence}</dd></div>
                <div><dt>"다음 연결"</dt><dd>{copy.bridge}</dd></div>
            </dl>
        </article>
    }
    .into_any()
}

const fn evidence_prompt(stage: NarrativeStage) -> &'static str {
    match stage {
        NarrativeStage::Embedding => {
            "선택 token에서 token/position/sum의 같은 feature가 실제로 더해지는지 비교하세요."
        }
        NarrativeStage::AttentionLayerNorm => {
            "정규화 전후의 shape와 평균·표준편차, 선택 feature 값을 확인하세요."
        }
        NarrativeStage::QueryKeyValue => {
            "같은 입력이 Q·K·V의 서로 다른 값이 되는지, q token과 k token 주소를 구분해 보세요."
        }
        NarrativeStage::AttentionScores => {
            "16개 QᵢKᵢ 곱의 합이 captured raw score와 맞고 √D scaling 오차가 작은지 확인하세요."
        }
        NarrativeStage::CausalMask => {
            "선택 q보다 뒤의 k가 hatch로 차단되고 실제 mask 허용값과 일치하는지 확인하세요."
        }
        NarrativeStage::Softmax => {
            "선택 query의 전체 확률 합이 1이고 미래 key 확률이 0인지 확인하세요."
        }
        NarrativeStage::ValueAggregation => {
            "모든 key×feature P×V를 더한 값이 captured attention output과 일치하는지 확인하세요."
        }
        NarrativeStage::MlpAndResidual => {
            "LN₂, 4C 확장, exact GELU, C projection, residual 합의 실제 tensor 경계를 차례로 확인하세요."
        }
        NarrativeStage::LanguageModelHead => {
            "입력 끝 EOS의 final LayerNorm과 tied embedding head가 만든 전체 vocabulary logits를 확인하세요."
        }
    }
}
