use nanogpt_schema::{SamplingMode, TokenId};

use crate::app::architecture::ArchitectureOperation;

use super::{
    CandidateColumn, CandidateProjection, ContextPresentation, GenerationSection,
    SamplingProjection, appended_token_visible, context_presentation, generation_operation_slug,
    sample_marker, selection_outcome_visible, visible_columns,
};

fn projection(mode: SamplingMode, selected_interval: Option<(f32, f32)>) -> SamplingProjection {
    SamplingProjection {
        step_index: 1,
        mode,
        temperature: 0.5,
        applied_top_k: 2,
        vocabulary_size: 259,
        discarded_count: 257,
        selected_token_id: TokenId(9),
        selected_display: "나".to_owned(),
        selected_logit: 2.0,
        selected_probability: 0.25,
        candidates: vec![CandidateProjection {
            token_id: TokenId(9),
            display: "나".to_owned(),
            raw_logit: 2.0,
            temperature_logit: 4.0,
            probability: 0.25,
            cumulative_start: 0.75,
            cumulative_end: 1.0,
            selected: true,
        }],
        probability_sum: 1.0,
        random: match mode {
            SamplingMode::Greedy => None,
            SamplingMode::Sample => Some(0.8),
        },
        selected_interval,
        before_context: vec![TokenId(0), TokenId(7)],
        after_context: vec![TokenId(0), TokenId(7), TokenId(9)],
        next_context: Some(vec![TokenId(0), TokenId(7), TokenId(9)]),
        next_context_matches: Some(true),
    }
}

#[test]
fn only_sample_exposes_selected_outcome_columns_and_row_state() {
    // Given: every candidate-bearing Generation section.
    let sections = [
        GenerationSection::RawLogits,
        GenerationSection::Temperature,
        GenerationSection::TopK,
        GenerationSection::Probability,
        GenerationSection::Sample,
    ];

    // When / Then: selected outcome appears only at Sample.
    for section in sections {
        assert_eq!(
            visible_columns(section).contains(&CandidateColumn::Selected),
            section == GenerationSection::Sample
        );
        assert_eq!(
            selection_outcome_visible(section),
            section == GenerationSection::Sample
        );
    }
    assert!(!appended_token_visible(GenerationSection::Sample));
    assert!(appended_token_visible(GenerationSection::Append));
    assert!(appended_token_visible(GenerationSection::Repeat));
}

#[test]
fn greedy_has_no_marker_or_interval_evidence() {
    // Given: Greedy probabilities with no authoritative draw or interval.
    let greedy = projection(SamplingMode::Greedy, None);

    // When / Then: the Sample visual receives no selection marker geometry.
    assert_eq!(sample_marker(&greedy), None);
}

#[test]
fn sample_marker_uses_stored_interval_and_reports_derived_cdf_parity() {
    // Given: stored interval deliberately differs from the selected candidate's derived CDF.
    let sample = projection(SamplingMode::Sample, Some((0.70, 0.95)));

    // When: marker geometry is projected for Sample.
    let marker = sample_marker(&sample);

    // Then: geometry uses stored bounds and parity exposes the mismatch.
    assert!(matches!(marker, Some(marker) if
        (marker.random - 0.8).abs() < f32::EPSILON
        && (marker.interval_start - 0.70).abs() < f32::EPSILON
        && (marker.interval_end - 0.95).abs() < f32::EPSILON
        && !marker.derived_interval_matches
    ));
}

#[test]
fn generation_operation_slugs_are_exhaustive_and_exact() {
    // Given: every Generation operation.
    let operations = [
        ArchitectureOperation::Logits,
        ArchitectureOperation::Temperature,
        ArchitectureOperation::TopK,
        ArchitectureOperation::GenerationSoftmax,
        ArchitectureOperation::Sample,
        ArchitectureOperation::Append,
        ArchitectureOperation::Repeat,
    ];

    // When / Then: each has an exact machine slug with no wildcard fallback.
    assert_eq!(
        operations.map(generation_operation_slug),
        [
            Some("logits"),
            Some("temperature"),
            Some("top-k"),
            Some("softmax"),
            Some("sample"),
            Some("append"),
            Some("repeat"),
        ]
    );
    assert_eq!(
        generation_operation_slug(ArchitectureOperation::Embedding),
        None
    );
}

#[test]
fn append_and_repeat_have_distinct_context_presentations() {
    // Given / When: the two context operations are classified.
    let append = context_presentation(GenerationSection::Append);
    let repeat = context_presentation(GenerationSection::Repeat);

    // Then: only Append owns the equation and Repeat owns parity/full-prefix evidence.
    assert_eq!(append, Some(ContextPresentation::AppendEquation));
    assert_eq!(repeat, Some(ContextPresentation::RepeatParity));
}
