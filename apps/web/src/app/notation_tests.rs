//! Canonical architecture notation contracts.

use std::collections::HashSet;

use super::{
    architecture_overview::ArchitectureNodeId,
    notation::{
        ATTENTION_INPUT_DEFINITION, ATTENTION_INPUT_DETAIL, ATTENTION_INPUT_TITLE,
        ATTENTION_OUTPUT_DETAIL, ATTENTION_OUTPUT_TITLE, ATTENTION_SUMMARY,
        ATTENTION_VALUE_CAPTION, BLOCK_INPUT_DETAIL, BLOCK_INPUT_TITLE, BLOCK_OUTPUT_DETAIL,
        BLOCK_OUTPUT_SYMBOL, BLOCK_OUTPUT_TITLE, BLOCK_RESIDUAL_1_DETAIL, BLOCK_RESIDUAL_1_SYMBOL,
        BLOCK_RESIDUAL_1_TITLE, CurrentAttentionShapes, HEAD_OUTPUT_DETAIL, HEAD_OUTPUT_TITLE,
        ROOT_HIDDEN_INPUT, ROOT_HIDDEN_OUTPUT, ROOT_HIDDEN_SHAPE, SPLIT_HEADS_DETAIL,
        SPLIT_HEADS_TITLE, VALUE_HEAD_EDGE_LABEL, attention_symbol_definitions, block_repeat_label,
        current_sequence_length, notation_entries, notation_for, symbolic_shape,
    },
    state::AppState,
};

#[test]
fn notation_catalog_has_unique_operation_entries() {
    let entries = notation_entries().collect::<Vec<_>>();
    let ids = entries.iter().map(|entry| entry.id).collect::<HashSet<_>>();

    assert_eq!(ids.len(), entries.len());
    assert_eq!(entries.len(), ArchitectureNodeId::ALL.len());
    assert!(
        ArchitectureNodeId::ALL
            .into_iter()
            .all(|id| notation_for(id).is_some())
    );
}

#[test]
fn score_matmul_uses_at_symbol() {
    let entry = notation_for(ArchitectureNodeId::AttentionScores);

    assert_eq!(
        entry.map(|value| (value.title, value.formula)),
        Some(("Score MatMul", "S_h = Q_h @ K_hᵀ"))
    );
}

#[test]
fn value_matmul_uses_at_symbol() {
    let entry = notation_for(ArchitectureNodeId::AttentionValueAggregation);

    assert_eq!(
        entry.map(|value| (value.title, value.formula)),
        Some(("Value MatMul", "Y_h = A_h @ V_h"))
    );
}

#[test]
fn block_repetition_alone_uses_multiplication_sign() {
    assert_eq!(block_repeat_label(2), "Transformer Block × 2");
    assert!(notation_entries().all(|entry| !entry.formula.contains('×')));
}

#[test]
fn residual_formulas_use_plus() {
    let first = notation_for(ArchitectureNodeId::Residual1);
    let second = notation_for(ArchitectureNodeId::Residual2);

    assert!(first.is_some_and(|entry| entry.formula.contains('+')));
    assert!(second.is_some_and(|entry| entry.formula.contains('+')));
}

#[test]
fn symbolic_shapes_contain_no_concrete_dimensions() {
    let forbidden = ["64", "16", "[4,", "[1,"];

    assert!(notation_entries().all(|entry| {
        forbidden.iter().all(|value| {
            !entry.symbolic_input.contains(value)
                && !entry.symbolic_output.contains(value)
                && !entry.diagram_detail.contains(value)
        })
    }));
}

#[test]
fn current_shapes_derive_from_config_and_trace() {
    let shapes = CurrentAttentionShapes::from_config(64, 4, Some(18));

    assert_eq!(
        shapes.map(|value| (
            value.score_matmul(),
            value.value_matmul(),
            value.full_head_tensor()
        )),
        Some((
            Some("[18, 16] @ [16, 18] → [18, 18]".to_owned()),
            Some("[18, 18] @ [18, 16] → [18, 16]".to_owned()),
            Some("[1, 4, 18, 16]".to_owned())
        ))
    );
}

#[test]
fn head_dimension_is_model_width_divided_by_heads() {
    let shapes = CurrentAttentionShapes::from_config(64, 4, None);

    assert_eq!(shapes.map(CurrentAttentionShapes::head_dimension), Some(16));
}

#[test]
fn sequence_length_is_unavailable_before_trace() {
    let shapes = CurrentAttentionShapes::from_config(64, 4, None);

    assert_eq!(
        shapes.map(|value| (value.sequence_length(), value.score_matmul())),
        Some((None, None))
    );
}

#[test]
fn root_uses_initial_and_final_hidden_state_symbols() {
    assert_eq!(ROOT_HIDDEN_INPUT, "Hidden State X₀");
    assert_eq!(ROOT_HIDDEN_OUTPUT, "Hidden State X_N");
}

#[test]
fn block_uses_named_tensor_symbols() {
    assert_eq!(BLOCK_RESIDUAL_1_SYMBOL, "X_res1");
    assert_eq!(BLOCK_OUTPUT_SYMBOL, "X_out");
    assert!(
        notation_for(ArchitectureNodeId::LayerNorm1)
            .is_some_and(|entry| entry.formula.contains("X_in"))
    );
}

#[test]
fn attention_uses_score_probability_and_output_symbols() {
    let formulas = notation_entries()
        .map(|entry| entry.formula)
        .collect::<String>();

    assert!(formulas.contains("S_h"));
    assert!(formulas.contains("A_h"));
    assert!(formulas.contains("Y_h"));
}

#[test]
fn canonical_catalog_excludes_legacy_visible_labels() {
    let text = notation_entries()
        .flat_map(|entry| [entry.title, entry.formula, entry.diagram_detail])
        .collect::<String>();

    for forbidden in ["Q × Kᵀ", "× V", "1 / √16", "Block Input x", "x′"] {
        assert!(
            !text.contains(forbidden),
            "legacy label remains: {forbidden}"
        );
    }
    assert_eq!(
        notation_for(ArchitectureNodeId::AttentionScores).map(symbolic_shape),
        Some("[T, D] @ [D, T] → [T, T]".to_owned())
    );
}

#[test]
fn ui_notation_constants_are_central_and_nonempty() {
    let values = [
        ATTENTION_INPUT_DEFINITION,
        ATTENTION_INPUT_DETAIL,
        ATTENTION_INPUT_TITLE,
        ATTENTION_OUTPUT_DETAIL,
        ATTENTION_OUTPUT_TITLE,
        ATTENTION_SUMMARY,
        ATTENTION_VALUE_CAPTION,
        BLOCK_INPUT_DETAIL,
        BLOCK_INPUT_TITLE,
        BLOCK_OUTPUT_DETAIL,
        BLOCK_OUTPUT_TITLE,
        BLOCK_RESIDUAL_1_DETAIL,
        BLOCK_RESIDUAL_1_TITLE,
        HEAD_OUTPUT_DETAIL,
        HEAD_OUTPUT_TITLE,
        ROOT_HIDDEN_SHAPE,
        SPLIT_HEADS_DETAIL,
        SPLIT_HEADS_TITLE,
        VALUE_HEAD_EDGE_LABEL,
    ];

    assert!(values.into_iter().all(|value| !value.is_empty()));
    assert_eq!(attention_symbol_definitions().count(), 12);
}

#[test]
fn current_values_cover_config_trace_and_empty_state() {
    let state = AppState::default();
    let shapes = CurrentAttentionShapes::from_config(64, 4, Some(18));

    assert_eq!(current_sequence_length(&state), None);
    assert_eq!(
        shapes.map(|value| (
            value.model_width(),
            value.head_count(),
            value.scale_factor(),
            value.head_tensor(),
            value.current_shape(ArchitectureNodeId::AttentionOutputProjection)
        )),
        Some((
            64,
            4,
            Some(0.25),
            Some("[4, 18, 16]".to_owned()),
            Some("[18, 64] → [18, 64]".to_owned())
        ))
    );
}
