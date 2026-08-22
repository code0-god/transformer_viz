use nanogpt_schema::{
    BlockTrace, FiniteF32, MlpTrace, OperationId, OperationTrace, SchemaError, SchemaVersion,
    SourceReference, TensorSnapshot,
};

use crate::trace_lookup::{
    TraceLookup, TraceLookupError, bhtd_shape, btc_shape, clamp_feature_index,
    selected_head_token_slice, selected_token_row,
};

fn tensor(id: &str, shape: Vec<usize>) -> Result<TensorSnapshot, SchemaError> {
    let count = shape.iter().product();
    let values = (0..count)
        .scan(0.0_f32, |value, _| {
            let current = *value;
            *value += 1.0;
            Some(FiniteF32::new(current))
        })
        .collect::<Result<Vec<_>, _>>()?;
    TensorSnapshot::new(id.to_owned(), shape, values)
}

fn source() -> SourceReference {
    SourceReference {
        file: "model.py".to_owned(),
        symbol: "forward".to_owned(),
        start_line: 1,
        end_line: 1,
    }
}

fn operation(id: &str) -> Result<OperationTrace, SchemaError> {
    let tensor = tensor(id, vec![1])?;
    Ok(OperationTrace {
        operation: OperationId::QueryKeyValue,
        source: source(),
        output: tensor.stats.clone(),
        tensor,
    })
}

fn block() -> Result<BlockTrace, SchemaError> {
    Ok(BlockTrace {
        schema_version: SchemaVersion::current(),
        run_id: 1,
        layer: 0,
        operations: vec![operation("query")?, operation("key")?, operation("value")?],
        attention_residual: tensor("attention_residual", vec![1])?,
        mlp: MlpTrace {
            layer: 0,
            input: tensor("mlp_input", vec![1])?,
            hidden: tensor("mlp_hidden", vec![1])?,
            activated: tensor("mlp_activated", vec![1])?,
            output: tensor("mlp_output", vec![1])?,
            source: source(),
        },
        output: tensor("block_output", vec![1])?,
    })
}

#[test]
fn operation_lookup_uses_operation_and_tensor_id_not_array_position()
-> Result<(), Box<dyn std::error::Error>> {
    let block = block()?;
    let lookup = TraceLookup::new().with_block(&block);

    let key = lookup.operation_tensor(OperationId::QueryKeyValue, "key")?;

    assert_eq!(key.id, "key");
    assert_eq!(lookup.block_tensor("mlp_activated")?.id, "mlp_activated");
    assert_eq!(
        lookup.operation_tensor(OperationId::Attention, "key"),
        Err(TraceLookupError::TensorNotFound("key".to_owned()))
    );
    Ok(())
}

#[test]
fn empty_lookup_is_typed_instead_of_panicking() {
    assert_eq!(TraceLookup::new().final_layer_norm(), None);
    assert_eq!(
        TraceLookup::new().head_tensor("query"),
        Err(TraceLookupError::Empty("attention head"))
    );
}

#[test]
fn shape_helpers_select_exact_rows_and_reject_invalid_selectors()
-> Result<(), Box<dyn std::error::Error>> {
    let btc = tensor("btc", vec![2, 3, 4])?;
    let bhtd = tensor("bhtd", vec![1, 2, 3, 2])?;

    assert_eq!(btc_shape(&btc)?, [2, 3, 4]);
    assert_eq!(bhtd_shape(&bhtd)?, [1, 2, 3, 2]);
    assert_eq!(
        selected_token_row(&btc, 1, 1)?
            .iter()
            .map(|value| value.get())
            .collect::<Vec<_>>(),
        vec![16.0, 17.0, 18.0, 19.0]
    );
    assert_eq!(
        selected_head_token_slice(&bhtd, 0, 1, 2)?
            .iter()
            .map(|value| value.get())
            .collect::<Vec<_>>(),
        vec![10.0, 11.0]
    );
    assert!(matches!(
        selected_token_row(&btc, 2, 0),
        Err(TraceLookupError::SelectionOutOfBounds(_, _))
    ));
    assert!(matches!(
        btc_shape(&bhtd),
        Err(TraceLookupError::InvalidShape(_, 3, _))
    ));
    Ok(())
}

#[test]
fn feature_clamping_handles_empty_axes() {
    assert_eq!(clamp_feature_index(7, 4), Some(3));
    assert_eq!(clamp_feature_index(2, 4), Some(2));
    assert_eq!(clamp_feature_index(0, 0), None);
}
