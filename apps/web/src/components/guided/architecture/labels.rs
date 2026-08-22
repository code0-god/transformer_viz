use crate::app::architecture::ArchitectureOperation;

pub(super) const fn operation_slug(operation: ArchitectureOperation) -> &'static str {
    use ArchitectureOperation as O;
    match operation {
        O::Embedding => "embedding",
        O::FinalLayerNorm => "final-layernorm",
        O::LanguageModelHead => "lm-head",
        O::AttentionLayerNorm => "ln1",
        O::AttentionResidual => "attention-residual",
        O::MlpLayerNorm => "ln2",
        O::Mlp => "mlp",
        O::MlpResidual => "mlp-residual",
        O::Query => "query",
        O::Key => "key",
        O::Value => "value",
        O::QueryKeyProduct => "qk-product",
        O::Scale => "scale",
        O::Mask => "mask",
        O::Softmax => "softmax",
        O::ValueProduct => "value-product",
        O::MergeHeads => "merge-heads",
        O::Projection => "projection",
        O::Logits => "logits",
        O::Temperature => "temperature",
        O::TopK => "top-k",
        O::GenerationSoftmax => "generation-softmax",
        O::Sample => "sample",
        O::Append => "append",
        O::Repeat => "repeat",
    }
}
