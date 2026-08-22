use nanogpt_schema::{
    CumulativeProbabilityInterval, FiniteF32, GenerationConfig, GenerationStepSummary,
    LogitCandidate, SamplingMode, SchemaError, Temperature, TokenId, TokenInfo, TokenKind, TopK,
};

use crate::app::architecture::ArchitectureOperation;

use super::{
    CandidateColumn, GenerationSection, ProjectionInput, generation_section,
    is_generation_sampling_operation, project_selected_step, visible_columns,
};

type TestResult = Result<(), SchemaError>;

fn token(id: u32, display: &str) -> TokenInfo {
    TokenInfo {
        id: TokenId(id),
        display: display.to_owned(),
        piece: display.as_bytes().to_vec(),
        byte_start: None,
        byte_end: None,
        kind: TokenKind::Byte,
    }
}

fn candidate(
    id: u32,
    display: &str,
    logit: f32,
    probability: f32,
) -> Result<LogitCandidate, SchemaError> {
    Ok(LogitCandidate {
        token_id: TokenId(id),
        display: display.to_owned(),
        logit: FiniteF32::new(logit)?,
        probability: FiniteF32::new(probability)?,
    })
}

fn config(mode: SamplingMode) -> Result<GenerationConfig, SchemaError> {
    Ok(GenerationConfig {
        max_new_tokens: 3,
        temperature: Temperature::new(0.5)?,
        top_k: TopK::new(2)?,
        mode,
        seed: 42,
    })
}

fn step(mode: SamplingMode) -> Result<GenerationStepSummary, SchemaError> {
    Ok(GenerationStepSummary {
        index: 1,
        context_token_ids: vec![TokenId(0), TokenId(7)],
        generated_token: token(9, "나"),
        selected_logit: FiniteF32::new(2.0)?,
        selected_probability: FiniteF32::new(0.25)?,
        candidates: vec![
            candidate(8, "가", 3.0, 0.75)?,
            candidate(9, "나", 2.0, 0.25)?,
        ],
        random: match mode {
            SamplingMode::Greedy => None,
            SamplingMode::Sample => Some(FiniteF32::new(0.8)?),
        },
        selected_interval: match mode {
            SamplingMode::Greedy => None,
            SamplingMode::Sample => Some(CumulativeProbabilityInterval {
                start: FiniteF32::new(0.75)?,
                end: FiniteF32::new(1.0)?,
            }),
        },
        forward_ms: FiniteF32::new(1.0)?,
        sampling_ms: FiniteF32::new(0.2)?,
        total_ms: FiniteF32::new(1.2)?,
    })
}

#[test]
fn projects_authoritative_selected_step_when_compact_history_is_available() -> TestResult {
    // Given: a selected sampled step and the next compact step.
    let selected = step(SamplingMode::Sample)?;
    let mut next = step(SamplingMode::Sample)?;
    next.index = 2;
    next.context_token_ids = vec![TokenId(0), TokenId(7), TokenId(9)];

    // When: the visualization projection is built from retained data only.
    let sample_config = config(SamplingMode::Sample)?;
    let projection = project_selected_step(ProjectionInput {
        step: &selected,
        config: &sample_config,
        vocabulary_size: 259,
        next: Some(&next),
    });

    // Then: raw/derived/stored values and context parity remain distinguishable.
    assert_eq!(projection.selected_token_id, TokenId(9));
    assert!((projection.selected_logit - 2.0).abs() < f32::EPSILON);
    assert!((projection.candidates[1].temperature_logit - 4.0).abs() < f32::EPSILON);
    assert!((projection.probability_sum - 1.0).abs() < f32::EPSILON);
    assert_eq!(projection.discarded_count, 257);
    assert!(matches!(projection.random, Some(value) if (value - 0.8).abs() < f32::EPSILON));
    assert!(
        matches!(projection.selected_interval, Some((start, end)) if (start - 0.75).abs() < f32::EPSILON && (end - 1.0).abs() < f32::EPSILON)
    );
    assert_eq!(
        projection.after_context,
        vec![TokenId(0), TokenId(7), TokenId(9)]
    );
    assert_eq!(projection.next_context_matches, Some(true));
    Ok(())
}

#[test]
fn projects_greedy_absence_without_inventing_random_evidence() -> TestResult {
    // Given: a greedy selected step with no adjacent next step.
    let selected = step(SamplingMode::Greedy)?;

    // When: the retained payload is projected.
    let greedy_config = config(SamplingMode::Greedy)?;
    let projection = project_selected_step(ProjectionInput {
        step: &selected,
        config: &greedy_config,
        vocabulary_size: 259,
        next: None,
    });

    // Then: random and interval stay absent and terminal parity is unknown.
    assert_eq!(projection.random, None);
    assert_eq!(projection.selected_interval, None);
    assert_eq!(projection.next_context_matches, None);
    Ok(())
}

#[test]
fn each_candidate_operation_exposes_only_semantic_columns() {
    // Given: candidate-bearing sections with distinct evidence contracts.
    let expected = [
        (
            GenerationSection::RawLogits,
            &[
                CandidateColumn::Candidate,
                CandidateColumn::TokenId,
                CandidateColumn::Raw,
            ][..],
        ),
        (
            GenerationSection::Temperature,
            &[
                CandidateColumn::Candidate,
                CandidateColumn::TokenId,
                CandidateColumn::Raw,
                CandidateColumn::Scaled,
            ][..],
        ),
        (
            GenerationSection::TopK,
            &[
                CandidateColumn::Rank,
                CandidateColumn::Candidate,
                CandidateColumn::TokenId,
                CandidateColumn::Retained,
            ][..],
        ),
        (
            GenerationSection::Probability,
            &[
                CandidateColumn::Candidate,
                CandidateColumn::TokenId,
                CandidateColumn::Probability,
            ][..],
        ),
        (
            GenerationSection::Sample,
            &[
                CandidateColumn::Candidate,
                CandidateColumn::TokenId,
                CandidateColumn::Probability,
                CandidateColumn::CdfStart,
                CandidateColumn::CdfEnd,
                CandidateColumn::Selected,
            ][..],
        ),
    ];

    // When / Then: no operation leaks another section's columns.
    for (section, columns) in expected {
        assert_eq!(visible_columns(section), columns);
    }
}

#[test]
fn each_generation_operation_dispatches_to_one_dominant_section() {
    // Given: the exact Generation operation sequence.
    let operations = [
        ArchitectureOperation::Logits,
        ArchitectureOperation::Temperature,
        ArchitectureOperation::TopK,
        ArchitectureOperation::GenerationSoftmax,
        ArchitectureOperation::Sample,
        ArchitectureOperation::Append,
        ArchitectureOperation::Repeat,
    ];
    let expected = [
        GenerationSection::RawLogits,
        GenerationSection::Temperature,
        GenerationSection::TopK,
        GenerationSection::Probability,
        GenerationSection::Sample,
        GenerationSection::Append,
        GenerationSection::Repeat,
    ];

    // When: each operation is projected to its visual section.
    let actual = operations.map(generation_section);

    // Then: dispatch is one-to-one, with no pipeline-dashboard aggregate.
    assert_eq!(actual, expected.map(Some));
}

#[test]
fn generation_dispatch_owns_all_seven_operations() {
    // Given: every operation in the Generation level, including legacy-mapped Logits.
    let operations = [
        ArchitectureOperation::Logits,
        ArchitectureOperation::Temperature,
        ArchitectureOperation::TopK,
        ArchitectureOperation::GenerationSoftmax,
        ArchitectureOperation::Sample,
        ArchitectureOperation::Append,
        ArchitectureOperation::Repeat,
    ];

    // When / Then: each operation resolves to the dedicated sampling visual.
    for operation in operations {
        assert!(is_generation_sampling_operation(operation));
    }
    assert!(!is_generation_sampling_operation(
        ArchitectureOperation::LanguageModelHead
    ));
}
