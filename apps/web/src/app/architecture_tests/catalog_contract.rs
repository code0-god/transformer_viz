use super::*;

#[test]
fn catalog_has_exact_four_levels_and_config_driven_coordinates() {
    // Given: a validated model configuration with non-default layer/head counts.
    let config = config();

    // When: every architecture catalog is materialized.
    let levels = ArchitectureLevel::ALL;
    let gpt = catalog(&config, ArchitectureLevel::Gpt);
    let attention = catalog(&config, ArchitectureLevel::Attention);

    // Then: level identity and coordinate nodes come only from the configuration.
    assert_eq!(
        levels,
        [
            ArchitectureLevel::Gpt,
            ArchitectureLevel::Block,
            ArchitectureLevel::Attention,
            ArchitectureLevel::Generation,
        ]
    );
    assert_eq!(
        levels.map(ArchitectureLevel::slug),
        ["gpt", "block", "attention", "generation"]
    );
    assert_eq!(
        gpt.iter()
            .filter(|node| matches!(node.kind, ArchitectureNodeKind::Layer(_)))
            .count(),
        config.n_layer
    );
    assert_eq!(
        attention
            .iter()
            .filter(|node| matches!(node.kind, ArchitectureNodeKind::Head(_)))
            .count(),
        config.n_head
    );
    assert_eq!(ArchitectureMapState::head_width(&config), 16);
}

#[test]
fn catalog_operation_values_match_the_four_level_contract() {
    // Given: the architecture catalog contract.
    let config = config();

    // When: operation values are extracted without presentation copy.
    let operations = |level| {
        catalog(&config, level)
            .into_iter()
            .filter_map(|node| match node.kind {
                ArchitectureNodeKind::Operation(operation) => Some(operation),
                ArchitectureNodeKind::Layer(_)
                | ArchitectureNodeKind::Head(_)
                | ArchitectureNodeKind::Level(_) => None,
            })
            .collect::<Vec<_>>()
    };

    // Then: every level exposes the exact machine-consumed operation order.
    assert_eq!(
        operations(ArchitectureLevel::Gpt),
        [
            ArchitectureOperation::Embedding,
            ArchitectureOperation::FinalLayerNorm,
            ArchitectureOperation::LanguageModelHead,
        ]
    );
    assert_eq!(
        operations(ArchitectureLevel::Block),
        [
            ArchitectureOperation::AttentionLayerNorm,
            ArchitectureOperation::AttentionResidual,
            ArchitectureOperation::MlpLayerNorm,
            ArchitectureOperation::Mlp,
            ArchitectureOperation::MlpResidual,
        ]
    );
    assert_eq!(
        operations(ArchitectureLevel::Attention),
        [
            ArchitectureOperation::Query,
            ArchitectureOperation::Key,
            ArchitectureOperation::Value,
            ArchitectureOperation::QueryKeyProduct,
            ArchitectureOperation::Scale,
            ArchitectureOperation::Mask,
            ArchitectureOperation::Softmax,
            ArchitectureOperation::ValueProduct,
            ArchitectureOperation::MergeHeads,
            ArchitectureOperation::Projection,
        ]
    );
    assert_eq!(
        operations(ArchitectureLevel::Generation),
        [
            ArchitectureOperation::Logits,
            ArchitectureOperation::Temperature,
            ArchitectureOperation::TopK,
            ArchitectureOperation::GenerationSoftmax,
            ArchitectureOperation::Sample,
            ArchitectureOperation::Append,
            ArchitectureOperation::Repeat,
        ]
    );
}

#[test]
fn architecture_operations_partition_all_retained_details_exactly_once() {
    let expected: &[(ArchitectureOperation, &[usize])] = &[
        (ArchitectureOperation::Embedding, &[]),
        (ArchitectureOperation::FinalLayerNorm, &[]),
        (ArchitectureOperation::LanguageModelHead, &[]),
        (ArchitectureOperation::AttentionLayerNorm, &[0, 1]),
        (ArchitectureOperation::AttentionResidual, &[11]),
        (ArchitectureOperation::MlpLayerNorm, &[12]),
        (ArchitectureOperation::Mlp, &[13, 14, 15, 16]),
        (ArchitectureOperation::MlpResidual, &[17]),
        (ArchitectureOperation::Query, &[2]),
        (ArchitectureOperation::Key, &[3]),
        (ArchitectureOperation::Value, &[4]),
        (ArchitectureOperation::QueryKeyProduct, &[5]),
        (ArchitectureOperation::Scale, &[6]),
        (ArchitectureOperation::Mask, &[]),
        (ArchitectureOperation::Softmax, &[7]),
        (ArchitectureOperation::ValueProduct, &[8]),
        (ArchitectureOperation::MergeHeads, &[9]),
        (ArchitectureOperation::Projection, &[10]),
        (ArchitectureOperation::Logits, &[]),
        (ArchitectureOperation::Temperature, &[]),
        (ArchitectureOperation::TopK, &[]),
        (ArchitectureOperation::GenerationSoftmax, &[]),
        (ArchitectureOperation::Sample, &[]),
        (ArchitectureOperation::Append, &[]),
        (ArchitectureOperation::Repeat, &[]),
    ];
    assert_eq!(expected.len(), ArchitectureOperation::ALL.len());
    let mut retained = Vec::new();
    for (operation, indices) in expected {
        assert_eq!(operation.retained_detail_indices(), *indices);
        retained.extend_from_slice(indices);
    }
    retained.sort_unstable();
    assert_eq!(retained, (0..18).collect::<Vec<_>>());
}
