//! Retained-data-only visualization for one selected generation step.

#[path = "generation_sampling/candidate_table.rs"]
mod candidate_table;

use leptos::prelude::*;
use nanogpt_schema::SamplingMode;

use crate::app::{architecture::ArchitectureOperation, state::AppState};

pub(crate) use crate::app::generation_sampling_projection::is_generation_sampling_operation;
use crate::app::generation_sampling_projection::{
    ContextPresentation, GenerationSection, ProjectionInput, SamplingProjection,
    appended_token_visible, context_presentation, generation_operation_slug, generation_section,
    project_selected_step, sample_marker, selection_outcome_visible,
};
use candidate_table::candidate_table;

pub(crate) fn visual(state: &AppState, operation: ArchitectureOperation) -> AnyView {
    let Some(projection) = selected_projection(state) else {
        return view! {
            <div class="stage-empty generation-selection-required" data-testid="generation-selection-required" role="status">
                <p><strong>"생성된 토큰을 먼저 선택하세요."</strong></p>
                <p>"선택 전에는 이전 replay 값이나 샘플링 값을 대신 표시하지 않습니다."</p>
            </div>
        }
        .into_any();
    };
    let (Some(operation_name), Some(section)) = (
        generation_operation_slug(operation),
        generation_section(operation),
    ) else {
        return inspector_empty("Generation 연산이 아닙니다.");
    };
    let outcome_visible = selection_outcome_visible(section);
    let appended_visible = appended_token_visible(section);
    view! {
        <div
            class="stage-visual sampling-visual"
            data-testid="generation-sampling-visual"
            data-operation=operation_name
            data-step-index=projection.step_index
            data-candidate-count=projection.candidates.len()
            data-selected-token-id=outcome_visible.then_some(projection.selected_token_id.0)
            data-selected-logit=outcome_visible.then_some(projection.selected_logit)
            data-selected-probability=outcome_visible.then_some(projection.selected_probability)
            data-temperature=(section == GenerationSection::Temperature).then_some(projection.temperature)
            data-top-k=(section == GenerationSection::TopK).then_some(projection.applied_top_k)
            data-vocabulary-size=(section == GenerationSection::TopK).then_some(projection.vocabulary_size)
            data-discarded-count=(section == GenerationSection::TopK).then_some(projection.discarded_count)
            data-probability-sum=matches!(section, GenerationSection::Probability | GenerationSection::Sample).then_some(projection.probability_sum)
            data-random=(section == GenerationSection::Sample).then(|| projection.random.map(|value| value.to_string())).flatten()
            data-selected-interval-start=(section == GenerationSection::Sample).then(|| projection.selected_interval.map(|interval| interval.0)).flatten()
            data-selected-interval-end=(section == GenerationSection::Sample).then(|| projection.selected_interval.map(|interval| interval.1)).flatten()
            data-appended-token-id=appended_visible.then_some(projection.selected_token_id.0)
            data-next-context-matches=(section == GenerationSection::Repeat).then(|| projection.next_context_matches.map(|matches| matches.to_string())).flatten()
        >
            {operation_view(operation, &projection)}
        </div>
    }
    .into_any()
}

pub(crate) fn inspector_evidence(state: &AppState) -> AnyView {
    let Some(operation) = state
        .ui
        .architecture
        .operation
        .filter(|operation| is_generation_sampling_operation(*operation))
    else {
        return ().into_any();
    };
    let Some(projection) = selected_projection(state) else {
        return inspector_empty("생성된 토큰을 선택하면 이 연산의 보존된 값을 표시합니다.");
    };
    let Some(operation_name) = generation_operation_slug(operation) else {
        return ().into_any();
    };
    view! {
        <div class="sampling-inspector" data-testid="sampling-inspector" data-operation=operation_name>
            {inspector_facts(state, operation, &projection)}
            <p>"표시 값은 선택한 TokenGenerated compact summary와 적용 설정에서만 읽습니다."</p>
        </div>
    }.into_any()
}

fn inspector_facts(
    state: &AppState,
    operation: ArchitectureOperation,
    projection: &SamplingProjection,
) -> AnyView {
    match generation_section(operation) {
        Some(GenerationSection::RawLogits) => {
            let replay_tensor = state
                .summary
                .as_ref()
                .map(|summary| summary.logits.logits.id.clone());
            view! { <dl><div><dt>"retained candidates"</dt><dd>{projection.candidates.len()}</dd></div><div><dt>"evidence"</dt><dd>"candidate raw logits"</dd></div>{replay_tensor.map(|tensor_id| view! { <div><dt>"replay tensor"</dt><dd><code>{tensor_id}</code></dd></div> })}</dl> }.into_any()
        }
        Some(GenerationSection::Temperature) => view! { <dl><div><dt>"applied T"</dt><dd>{format!("{:.9}", projection.temperature)}</dd></div><div><dt>"retained candidates"</dt><dd>{projection.candidates.len()}</dd></div><div><dt>"display math"</dt><dd>"각 candidate raw / T · 파생"</dd></div></dl> }.into_any(),
        Some(GenerationSection::TopK) => view! { <dl><div><dt>"applied K"</dt><dd>{projection.applied_top_k}</dd></div><div><dt>"vocabulary"</dt><dd>{projection.vocabulary_size}</dd></div><div><dt>"retained"</dt><dd>{projection.candidates.len()}</dd></div><div><dt>"discarded count"</dt><dd>{projection.discarded_count}</dd></div></dl> }.into_any(),
        Some(GenerationSection::Probability) => view! { <dl><div><dt>"stored p sum"</dt><dd>{format!("{:.9}", projection.probability_sum)}</dd></div><div><dt>"retained candidates"</dt><dd>{projection.candidates.len()}</dd></div><div><dt>"policy"</dt><dd>"확률 재계산 없음"</dd></div></dl> }.into_any(),
        Some(GenerationSection::Sample) => view! { <dl><div><dt>"selected token"</dt><dd>{format!("{} · ID {}", projection.selected_display, projection.selected_token_id.0)}</dd></div><div><dt>"selected raw / p"</dt><dd>{format!("{:+.9} / {:.9}", projection.selected_logit, projection.selected_probability)}</dd></div><div><dt>"mode"</dt><dd>{match projection.mode { SamplingMode::Greedy => "Greedy argmax", SamplingMode::Sample => "seeded Sample" }}</dd></div><div><dt>"random"</dt><dd>{projection.random.map_or_else(|| "없음".to_owned(), |value| format!("{value:.9}"))}</dd></div><div><dt>"selected interval"</dt><dd>{projection.selected_interval.map_or_else(|| "없음".to_owned(), |(start, end)| format!("[{start:.9}, {end:.9})"))}</dd></div></dl> }.into_any(),
        Some(GenerationSection::Append) => view! { <dl><div><dt>"before length"</dt><dd>{projection.before_context.len()}</dd></div><div><dt>"appended ID"</dt><dd>{projection.selected_token_id.0}</dd></div><div><dt>"after length"</dt><dd>{projection.after_context.len()}</dd></div></dl> }.into_any(),
        Some(GenerationSection::Repeat) => view! { <dl><div><dt>"after length"</dt><dd>{projection.after_context.len()}</dd></div><div><dt>"next parity"</dt><dd>{match projection.next_context_matches { Some(true) => "일치", Some(false) => "불일치", None => "terminal / no-next" }}</dd></div><div><dt>"forward"</dt><dd>"KV cache 없음 · 전체 prefix"</dd></div></dl> }.into_any(),
        None => inspector_empty("Generation 연산이 아닙니다."),
    }
}

pub(crate) fn explanation(state: &AppState) -> Option<&'static str> {
    let operation = state.ui.architecture.operation?;
    Some(match operation {
        ArchitectureOperation::Logits => {
            "선택한 생성 step에 보존된 후보 raw logit을 결과 표식 없이 비교합니다. replay가 현재 step에 정확히 묶였을 때만 전체 logits tensor ID를 함께 표시합니다."
        }
        ArchitectureOperation::Temperature => {
            "적용된 temperature와 각 후보 raw logit으로 raw / T를 표시용으로 계산합니다. 선택 결과는 아직 표시하지 않으며 파생 수학을 명시합니다."
        }
        ArchitectureOperation::TopK => {
            "보존된 후보와 적용 K, vocabulary 크기, 버린 개수만 표시합니다. 버린 토큰의 순위나 값은 추정하지 않습니다."
        }
        ArchitectureOperation::GenerationSoftmax => {
            "각 후보 probability는 TokenGenerated에 저장된 권위 값 그대로이며, 합계만 읽기 쉽게 더합니다. 선택 결과를 표시하거나 softmax를 다시 계산하지 않습니다."
        }
        ArchitectureOperation::Sample => {
            "Sample은 저장된 random marker와 누적 구간을 연결합니다. Greedy는 argmax 결정이며 random과 선택 구간이 없음을 그대로 보여 줍니다."
        }
        ArchitectureOperation::Append => {
            "선택 직전 context ID 순서 뒤에 생성 token ID 하나를 붙인 정확한 after-context를 비교합니다."
        }
        ArchitectureOperation::Repeat => {
            "after-context와 다음 compact step의 pre-context를 비교합니다. 다음 step이 없으면 terminal/no-next 상태이며 KV cache 없이 전체 prefix를 다시 forward합니다."
        }
        ArchitectureOperation::Embedding
        | ArchitectureOperation::FinalLayerNorm
        | ArchitectureOperation::LanguageModelHead
        | ArchitectureOperation::AttentionLayerNorm
        | ArchitectureOperation::AttentionResidual
        | ArchitectureOperation::MlpLayerNorm
        | ArchitectureOperation::Mlp
        | ArchitectureOperation::MlpResidual
        | ArchitectureOperation::Query
        | ArchitectureOperation::Key
        | ArchitectureOperation::Value
        | ArchitectureOperation::QueryKeyProduct
        | ArchitectureOperation::Scale
        | ArchitectureOperation::Mask
        | ArchitectureOperation::Softmax
        | ArchitectureOperation::ValueProduct
        | ArchitectureOperation::MergeHeads
        | ArchitectureOperation::Projection => return None,
    })
}

fn selected_projection(state: &AppState) -> Option<SamplingProjection> {
    let index = state.generation.selected_step?;
    let step = state.generation.steps.get(index)?;
    let config = state.generation.config.as_ref()?;
    let vocabulary_size = state.model.as_ref()?.config.vocab_size;
    Some(project_selected_step(ProjectionInput {
        step,
        config,
        vocabulary_size,
        next: state.generation.steps.get(index.saturating_add(1)),
    }))
}

fn operation_view(operation: ArchitectureOperation, projection: &SamplingProjection) -> AnyView {
    match generation_section(operation) {
        Some(GenerationSection::RawLogits) => {
            candidate_table(projection, GenerationSection::RawLogits)
        }
        Some(GenerationSection::Temperature) => temperature(projection),
        Some(GenerationSection::TopK) => top_k(projection),
        Some(GenerationSection::Probability) => probability(projection, false),
        Some(GenerationSection::Sample) => probability(projection, true),
        Some(section @ (GenerationSection::Append | GenerationSection::Repeat)) => {
            match context_presentation(section) {
                Some(ContextPresentation::AppendEquation) => append_context(projection),
                Some(ContextPresentation::RepeatParity) => repeat_context(projection),
                None => inspector_empty("Context 연산이 아닙니다."),
            }
        }
        None => inspector_empty("Generation 연산이 아닙니다."),
    }
}

fn temperature(projection: &SamplingProjection) -> AnyView {
    view! { <div class="sampling-stack"><p class="derived-math">{format!("표시용 파생 수학 · raw / T, T = {:.6}", projection.temperature)}</p>{candidate_table(projection, GenerationSection::Temperature)}</div> }.into_any()
}

fn top_k(projection: &SamplingProjection) -> AnyView {
    view! { <div class="sampling-stack"><dl class="sampling-summary"><div><dt>"적용 K"</dt><dd>{projection.applied_top_k}</dd></div><div><dt>"vocabulary"</dt><dd>{projection.vocabulary_size}</dd></div><div><dt>"보존"</dt><dd>{projection.candidates.len()}</dd></div><div><dt>"버림"</dt><dd>{projection.discarded_count}</dd></div></dl>{candidate_table(projection, GenerationSection::TopK)}<p>"버린 후보는 개수만 보존됩니다. 순위·logit·확률은 표시하지 않습니다."</p></div> }.into_any()
}

fn probability(projection: &SamplingProjection, sampling: bool) -> AnyView {
    let mode_copy = match projection.mode {
        SamplingMode::Greedy => "Greedy · 결정적 argmax · random/선택 구간 없음".to_owned(),
        SamplingMode::Sample => format!(
            "Sample · random {:.9}",
            projection.random.unwrap_or_default()
        ),
    };
    let section = if sampling {
        GenerationSection::Sample
    } else {
        GenerationSection::Probability
    };
    let verdict = if sampling {
        match sample_marker(projection) {
            Some(marker) if marker.derived_interval_matches => mode_copy,
            Some(_) => format!("{mode_copy} · 저장 구간과 표시용 derived CDF 불일치"),
            None => mode_copy,
        }
    } else {
        format!(
            "저장 확률 합계 {:.9} · 확률 재계산 없음",
            projection.probability_sum
        )
    };
    view! { <div class="sampling-stack">{distribution_svg(projection, sampling)}{candidate_table(projection, section)}<p class="sampling-verdict">{verdict}</p></div> }.into_any()
}

fn distribution_svg(projection: &SamplingProjection, sampling: bool) -> AnyView {
    let marker = sampling.then(|| sample_marker(projection)).flatten();
    view! { <svg class="sampling-distribution" viewBox="0 0 100 18" role="img"><title>{if sampling { "누적 샘플링 구간" } else { "저장된 후보 확률" }}</title><desc>{if marker.is_some() { "중립 후보 구간 위에 저장된 선택 구간을 빗금으로 표시하고 저장 random marker를 점선으로 표시합니다." } else { "후보의 저장 확률을 중립 구간으로 표시하며 선택 구간이나 random marker는 표시하지 않습니다." }}</desc><defs><pattern id="selected-sampling-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="3" /></pattern></defs>{projection.candidates.iter().map(|candidate| { let x = candidate.cumulative_start * 100.0; let width = candidate.probability * 100.0; view! { <rect x=x y="2" width=width height="10" /> }}).collect_view()}{marker.map(|selected| { let x = selected.interval_start * 100.0; let width = (selected.interval_end - selected.interval_start) * 100.0; view! { <g data-testid="stored-selected-interval" data-derived-parity=selected.derived_interval_matches data-interval-start=selected.interval_start data-interval-end=selected.interval_end><rect class="selected-pattern visible" x=x y="2" width=width height="10" /><text x=x + 1.0 y="16">"선택"</text><line class="random-marker" x1=selected.random * 100.0 y1="0" x2=selected.random * 100.0 y2="18" /></g> } })}</svg> }.into_any()
}

fn append_context(projection: &SamplingProjection) -> AnyView {
    view! { <div class="sampling-stack"><div class="context-equation"><span>"선택 직전"</span><ol>{token_ids(&projection.before_context)}</ol><b>"+"</b><span class="appended-token">{format!("{} · ID {}", projection.selected_display, projection.selected_token_id.0)}</span><b>"→"</b><span>"선택 후"</span><ol data-testid="after-context">{token_ids(&projection.after_context)}</ol></div><p class="sampling-verdict">"생성 token 하나를 정확한 pre-selection context 끝에 추가합니다."</p></div> }.into_any()
}

fn repeat_context(projection: &SamplingProjection) -> AnyView {
    let verdict = match projection.next_context_matches {
        Some(true) => "다음 step context와 정확히 일치",
        Some(false) => "다음 step context 불일치",
        None => "terminal / 다음 compact step 없음",
    };
    view! { <div class="sampling-stack repeat-parity" data-testid="repeat-parity"><div class="repeat-contexts"><section><strong>"현재 after-context"</strong><ol data-testid="repeat-after-context">{token_ids(&projection.after_context)}</ol></section><span aria-hidden="true">"→"</span><section><strong>"다음 step pre-context"</strong>{projection.next_context.as_ref().map_or_else(|| view! { <p>"terminal / no-next"</p> }.into_any(), |next| view! { <ol data-testid="repeat-next-context">{token_ids(next)}</ol> }.into_any())}</section></div><p class="sampling-verdict">{format!("{verdict} · KV cache 없음 · 전체 prefix forward")}</p></div> }.into_any()
}

fn token_ids(ids: &[nanogpt_schema::TokenId]) -> impl IntoView {
    ids.iter()
        .map(|id| view! { <li><code>{id.0}</code></li> })
        .collect_view()
}

fn inspector_empty(message: &'static str) -> AnyView {
    view! { <p class="empty-state inspector-empty" role="status">{message}</p> }.into_any()
}
