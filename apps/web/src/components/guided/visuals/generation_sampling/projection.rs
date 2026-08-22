#[cfg(test)]
#[path = "gate_tests.rs"]
mod gate_tests;
#[cfg(test)]
#[path = "tests.rs"]
mod tests;

use nanogpt_schema::{GenerationConfig, GenerationStepSummary, SamplingMode, TokenId};

pub(crate) use super::generation_sampling_contract::{
    CandidateColumn, ContextPresentation, GenerationSection, appended_token_visible,
    context_presentation, generation_operation_slug, generation_section,
    is_generation_sampling_operation, selection_outcome_visible, visible_columns,
};

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct CandidateProjection {
    pub(crate) token_id: TokenId,
    pub(crate) display: String,
    pub(crate) raw_logit: f32,
    pub(crate) temperature_logit: f32,
    pub(crate) probability: f32,
    pub(crate) cumulative_start: f32,
    pub(crate) cumulative_end: f32,
    pub(crate) selected: bool,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct SampleMarker {
    pub(crate) random: f32,
    pub(crate) interval_start: f32,
    pub(crate) interval_end: f32,
    pub(crate) derived_interval_matches: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct SamplingProjection {
    pub(crate) step_index: usize,
    pub(crate) mode: SamplingMode,
    pub(crate) temperature: f32,
    pub(crate) applied_top_k: usize,
    pub(crate) vocabulary_size: usize,
    pub(crate) discarded_count: usize,
    pub(crate) selected_token_id: TokenId,
    pub(crate) selected_display: String,
    pub(crate) selected_logit: f32,
    pub(crate) selected_probability: f32,
    pub(crate) candidates: Vec<CandidateProjection>,
    pub(crate) probability_sum: f32,
    pub(crate) random: Option<f32>,
    pub(crate) selected_interval: Option<(f32, f32)>,
    pub(crate) before_context: Vec<TokenId>,
    pub(crate) after_context: Vec<TokenId>,
    pub(crate) next_context: Option<Vec<TokenId>>,
    pub(crate) next_context_matches: Option<bool>,
}

pub(crate) fn sample_marker(projection: &SamplingProjection) -> Option<SampleMarker> {
    let (SamplingMode::Sample, Some(random), Some((interval_start, interval_end))) = (
        projection.mode,
        projection.random,
        projection.selected_interval,
    ) else {
        return None;
    };
    let derived_interval_matches = projection
        .candidates
        .iter()
        .find(|candidate| candidate.selected)
        .is_some_and(|candidate| {
            (candidate.cumulative_start - interval_start).abs() < f32::EPSILON
                && (candidate.cumulative_end - interval_end).abs() < f32::EPSILON
        });
    Some(SampleMarker {
        random,
        interval_start,
        interval_end,
        derived_interval_matches,
    })
}

#[derive(Clone, Copy)]
pub(crate) struct ProjectionInput<'a> {
    pub(crate) step: &'a GenerationStepSummary,
    pub(crate) config: &'a GenerationConfig,
    pub(crate) vocabulary_size: usize,
    pub(crate) next: Option<&'a GenerationStepSummary>,
}

pub(crate) fn project_selected_step(input: ProjectionInput<'_>) -> SamplingProjection {
    let ProjectionInput {
        step,
        config,
        vocabulary_size,
        next,
    } = input;
    let temperature = config.temperature.get();
    let mut cumulative = 0.0;
    let candidates = step
        .candidates
        .iter()
        .map(|candidate| {
            let start = cumulative;
            cumulative += candidate.probability.get();
            CandidateProjection {
                token_id: candidate.token_id,
                display: candidate.display.clone(),
                raw_logit: candidate.logit.get(),
                temperature_logit: candidate.logit.get() / temperature,
                probability: candidate.probability.get(),
                cumulative_start: start,
                cumulative_end: cumulative,
                selected: candidate.token_id == step.generated_token.id,
            }
        })
        .collect::<Vec<_>>();
    let mut after_context = step.context_token_ids.clone();
    after_context.push(step.generated_token.id);
    SamplingProjection {
        step_index: step.index,
        mode: config.mode,
        temperature,
        applied_top_k: config.top_k.get(),
        vocabulary_size,
        discarded_count: vocabulary_size.saturating_sub(step.candidates.len()),
        selected_token_id: step.generated_token.id,
        selected_display: step.generated_token.display.clone(),
        selected_logit: step.selected_logit.get(),
        selected_probability: step.selected_probability.get(),
        candidates,
        probability_sum: cumulative,
        random: step.random.map(nanogpt_schema::FiniteF32::get),
        selected_interval: step
            .selected_interval
            .map(|interval| (interval.start.get(), interval.end.get())),
        before_context: step.context_token_ids.clone(),
        next_context: next.map(|next_step| next_step.context_token_ids.clone()),
        next_context_matches: next.map(|next_step| next_step.context_token_ids == after_context),
        after_context,
    }
}
