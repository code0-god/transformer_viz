use crate::app::architecture::ArchitectureOperation;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum CandidateColumn {
    Rank,
    Candidate,
    TokenId,
    Raw,
    Scaled,
    Retained,
    Probability,
    CdfStart,
    CdfEnd,
    Selected,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum GenerationSection {
    RawLogits,
    Temperature,
    TopK,
    Probability,
    Sample,
    Append,
    Repeat,
}

pub(crate) const fn generation_section(
    operation: ArchitectureOperation,
) -> Option<GenerationSection> {
    match operation {
        ArchitectureOperation::Logits => Some(GenerationSection::RawLogits),
        ArchitectureOperation::Temperature => Some(GenerationSection::Temperature),
        ArchitectureOperation::TopK => Some(GenerationSection::TopK),
        ArchitectureOperation::GenerationSoftmax => Some(GenerationSection::Probability),
        ArchitectureOperation::Sample => Some(GenerationSection::Sample),
        ArchitectureOperation::Append => Some(GenerationSection::Append),
        ArchitectureOperation::Repeat => Some(GenerationSection::Repeat),
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
        | ArchitectureOperation::Projection => None,
    }
}

pub(crate) const fn is_generation_sampling_operation(operation: ArchitectureOperation) -> bool {
    generation_section(operation).is_some()
}

pub(crate) const fn generation_operation_slug(
    operation: ArchitectureOperation,
) -> Option<&'static str> {
    match operation {
        ArchitectureOperation::Logits => Some("logits"),
        ArchitectureOperation::Temperature => Some("temperature"),
        ArchitectureOperation::TopK => Some("top-k"),
        ArchitectureOperation::GenerationSoftmax => Some("softmax"),
        ArchitectureOperation::Sample => Some("sample"),
        ArchitectureOperation::Append => Some("append"),
        ArchitectureOperation::Repeat => Some("repeat"),
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
        | ArchitectureOperation::Projection => None,
    }
}

pub(crate) const fn visible_columns(section: GenerationSection) -> &'static [CandidateColumn] {
    use CandidateColumn as C;
    match section {
        GenerationSection::RawLogits => &[C::Candidate, C::TokenId, C::Raw],
        GenerationSection::Temperature => &[C::Candidate, C::TokenId, C::Raw, C::Scaled],
        GenerationSection::TopK => &[C::Rank, C::Candidate, C::TokenId, C::Retained],
        GenerationSection::Probability => &[C::Candidate, C::TokenId, C::Probability],
        GenerationSection::Sample => &[
            C::Candidate,
            C::TokenId,
            C::Probability,
            C::CdfStart,
            C::CdfEnd,
            C::Selected,
        ],
        GenerationSection::Append | GenerationSection::Repeat => &[],
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum ContextPresentation {
    AppendEquation,
    RepeatParity,
}

pub(crate) const fn selection_outcome_visible(section: GenerationSection) -> bool {
    matches!(section, GenerationSection::Sample)
}

pub(crate) const fn appended_token_visible(section: GenerationSection) -> bool {
    matches!(
        section,
        GenerationSection::Append | GenerationSection::Repeat
    )
}

pub(crate) const fn context_presentation(
    section: GenerationSection,
) -> Option<ContextPresentation> {
    match section {
        GenerationSection::Append => Some(ContextPresentation::AppendEquation),
        GenerationSection::Repeat => Some(ContextPresentation::RepeatParity),
        GenerationSection::RawLogits
        | GenerationSection::Temperature
        | GenerationSection::TopK
        | GenerationSection::Probability
        | GenerationSection::Sample => None,
    }
}
