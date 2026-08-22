use leptos::prelude::*;
use nanogpt_schema::SamplingMode;

use crate::app::generation_sampling_projection::{
    CandidateColumn, CandidateProjection, GenerationSection, SamplingProjection,
    selection_outcome_visible, visible_columns,
};

pub(super) fn candidate_table(
    projection: &SamplingProjection,
    section: GenerationSection,
) -> AnyView {
    let columns = visible_columns(section);
    let scale = value_scale(projection, section);
    view! {
        <div class="sampling-table-scroll" tabindex="0" role="region" aria-label="보존 후보 값 표, 가로 세로 스크롤 가능">
            <table class="sampling-values" data-testid=table_test_id(section)>
                <thead><tr>{columns.iter().map(|column| view! { <th scope="col" data-column=column_key(*column)>{column_label(*column)}</th> }).collect_view()}</tr></thead>
                <tbody>{projection.candidates.iter().enumerate().map(|(rank, candidate)| view! {
                    <tr class:selected=selection_outcome_visible(section) && projection.mode == SamplingMode::Sample && candidate.selected data-token-id=candidate.token_id.0>
                        {columns.iter().map(|column| cell(*column, RowContext { candidate, rank, scale })).collect_view()}
                    </tr>
                }).collect_view()}</tbody>
            </table>
        </div>
    }.into_any()
}

#[derive(Clone, Copy)]
struct ValueScale {
    min: f32,
    max: f32,
}

fn value_scale(projection: &SamplingProjection, section: GenerationSection) -> ValueScale {
    match section {
        GenerationSection::RawLogits => bounds(
            projection
                .candidates
                .iter()
                .map(|candidate| candidate.raw_logit),
        ),
        GenerationSection::Temperature => bounds(
            projection
                .candidates
                .iter()
                .flat_map(|candidate| [candidate.raw_logit, candidate.temperature_logit]),
        ),
        GenerationSection::Probability | GenerationSection::Sample => {
            ValueScale { min: 0.0, max: 1.0 }
        }
        GenerationSection::TopK | GenerationSection::Append | GenerationSection::Repeat => {
            ValueScale { min: 0.0, max: 1.0 }
        }
    }
}

fn bounds(values: impl Iterator<Item = f32>) -> ValueScale {
    let (mut min, mut max) = values
        .fold((f32::INFINITY, f32::NEG_INFINITY), |(min, max), value| {
            (min.min(value), max.max(value))
        });
    if !min.is_finite() || !max.is_finite() {
        return ValueScale { min: 0.0, max: 1.0 };
    }
    if (max - min).abs() < f32::EPSILON {
        min -= 1.0;
        max += 1.0;
    }
    ValueScale { min, max }
}

#[derive(Clone, Copy)]
struct RowContext<'a> {
    candidate: &'a CandidateProjection,
    rank: usize,
    scale: ValueScale,
}

fn cell(column: CandidateColumn, row: RowContext<'_>) -> AnyView {
    let RowContext {
        candidate,
        rank,
        scale,
    } = row;
    match column {
        CandidateColumn::Rank => view! { <td data-column="rank"><strong>{rank + 1}</strong></td> }.into_any(),
        CandidateColumn::Candidate => view! { <td data-column="candidate"><strong>{candidate.display.clone()}</strong></td> }.into_any(),
        CandidateColumn::TokenId => view! { <td data-column="token-id"><code>{candidate.token_id.0}</code></td> }.into_any(),
        CandidateColumn::Raw => numeric_meter("raw", candidate.raw_logit, scale),
        CandidateColumn::Scaled => numeric_meter("scaled", candidate.temperature_logit, scale),
        CandidateColumn::Retained => view! { <td data-column="retained">"보존"</td> }.into_any(),
        CandidateColumn::Probability => numeric_meter("probability", candidate.probability, scale),
        CandidateColumn::CdfStart => view! { <td data-column="cdf-start"><code>{format!("{:.9}", candidate.cumulative_start)}</code></td> }.into_any(),
        CandidateColumn::CdfEnd => view! { <td data-column="cdf-end"><code>{format!("{:.9}", candidate.cumulative_end)}</code></td> }.into_any(),
        CandidateColumn::Selected => view! { <td data-column="selected"><span class="candidate-mark">{if candidate.selected { "선택" } else { "후보" }}</span></td> }.into_any(),
    }
}

fn numeric_meter(key: &'static str, value: f32, scale: ValueScale) -> AnyView {
    view! {
        <td data-column=key data-value=value><span class="sampling-meter-cell">
            <code>{format!("{value:+.9}")}</code>
            <meter class=format!("sampling-meter {key}-meter") min=scale.min max=scale.max value=value aria-hidden="true">{value}</meter>
        </span></td>
    }.into_any()
}

const fn column_key(column: CandidateColumn) -> &'static str {
    match column {
        CandidateColumn::Rank => "rank",
        CandidateColumn::Candidate => "candidate",
        CandidateColumn::TokenId => "token-id",
        CandidateColumn::Raw => "raw",
        CandidateColumn::Scaled => "scaled",
        CandidateColumn::Retained => "retained",
        CandidateColumn::Probability => "probability",
        CandidateColumn::CdfStart => "cdf-start",
        CandidateColumn::CdfEnd => "cdf-end",
        CandidateColumn::Selected => "selected",
    }
}

const fn column_label(column: CandidateColumn) -> &'static str {
    match column {
        CandidateColumn::Rank => "rank",
        CandidateColumn::Candidate => "candidate",
        CandidateColumn::TokenId => "token ID",
        CandidateColumn::Raw => "raw logit",
        CandidateColumn::Scaled => "raw / T · 파생",
        CandidateColumn::Retained => "Top-K 상태",
        CandidateColumn::Probability => "stored p",
        CandidateColumn::CdfStart => "derived CDF start",
        CandidateColumn::CdfEnd => "derived CDF end",
        CandidateColumn::Selected => "선택",
    }
}

const fn table_test_id(section: GenerationSection) -> &'static str {
    match section {
        GenerationSection::RawLogits => "sampling-table-logits",
        GenerationSection::Temperature => "sampling-table-temperature",
        GenerationSection::TopK => "sampling-table-top-k",
        GenerationSection::Probability => "sampling-table-softmax",
        GenerationSection::Sample => "sampling-table-sample",
        GenerationSection::Append | GenerationSection::Repeat => "sampling-table-none",
    }
}
