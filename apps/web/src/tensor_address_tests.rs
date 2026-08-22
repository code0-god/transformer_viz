use nanogpt_schema::{FiniteF32, TensorSnapshot};

use crate::tensor_address::{TensorAddress, TensorAddressError};

fn tensor(id: &str, shape: &[usize]) -> Result<TensorSnapshot, Box<dyn std::error::Error>> {
    let values = (0..shape.iter().product())
        .scan(0.0_f32, |value, _| {
            let current = *value;
            *value += 1.0;
            Some(FiniteF32::new(current))
        })
        .collect::<Result<Vec<_>, _>>()?;
    Ok(TensorSnapshot::new(id.to_owned(), shape.to_vec(), values)?)
}

#[test]
fn vector_and_btc_addresses_are_exact_and_clamp_feature() -> Result<(), Box<dyn std::error::Error>>
{
    // Given: a vector and one [B,T,C] tensor.
    let vector = tensor("vector", &[4])?;
    let btc = tensor("btc", &[1, 3, 4])?;

    // When: their selected addresses are resolved.
    let vector_address = TensorAddress::vector(&vector, 99, 2)?;
    let btc_address = TensorAddress::token_feature(&btc, 2, 99, 3)?;

    // Then: flat indices, values, axes, and bounded slices are exact.
    assert_eq!(vector_address.flat_index(), 3);
    assert!((vector_address.value().get() - 3.0).abs() < f32::EPSILON);
    assert_eq!(vector_address.axis("feature"), Some(3));
    assert_eq!(btc_address.flat_index(), 11);
    assert!((btc_address.value().get() - 11.0).abs() < f32::EPSILON);
    assert_eq!(btc_address.axis("token"), Some(2));
    assert_eq!(btc_address.axis("feature"), Some(3));
    assert_eq!(btc_address.slice_start(), 8);
    assert_eq!(btc_address.slice().len(), 4);
    Ok(())
}

#[test]
fn captured_head_and_matrix_addresses_use_head_zero_and_qk_axes()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: selected-head [1,1,T,D] and score [1,1,T,T] tensors.
    let head = tensor("query", &[1, 1, 3, 4])?;
    let matrix = tensor("scores", &[1, 1, 3, 3])?;

    // When: a head feature and matrix cell are selected.
    let head_address = TensorAddress::head_token_feature(&head, 1, 2, 2)?;
    let matrix_address = TensorAddress::matrix_cell(&matrix, 2, 1, 3)?;

    // Then: captured head metadata and query/key coordinates stay explicit.
    assert_eq!(head_address.flat_index(), 6);
    assert_eq!(head_address.axis("head"), Some(0));
    assert_eq!(head_address.axis("token"), Some(1));
    assert_eq!(head_address.axis("feature"), Some(2));
    assert_eq!(matrix_address.flat_index(), 7);
    assert_eq!(matrix_address.axis("query"), Some(2));
    assert_eq!(matrix_address.axis("key"), Some(1));
    assert_eq!(matrix_address.slice_start(), 6);
    assert_eq!(matrix_address.slice().len(), 3);
    Ok(())
}

#[test]
fn missing_malformed_and_value_mismatch_shapes_are_typed_errors()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: missing, wrong-rank, and corrupted tensor shapes.
    let missing = tensor("missing", &[])?;
    let wrong_rank = tensor("wrong", &[2, 2])?;
    let mut mismatch = tensor("mismatch", &[1, 1, 2, 2])?;
    mismatch.values.pop();

    // When / Then: every malformed boundary returns a typed error.
    assert!(matches!(
        TensorAddress::vector(&missing, 0, 2),
        Err(TensorAddressError::InvalidRank { .. })
    ));
    assert!(matches!(
        TensorAddress::token_feature(&wrong_rank, 0, 0, 2),
        Err(TensorAddressError::InvalidRank { .. })
    ));
    assert!(matches!(
        TensorAddress::matrix_cell(&mismatch, 0, 0, 2),
        Err(TensorAddressError::ShapeValueMismatch { .. })
    ));
    assert!(matches!(
        TensorAddress::head_token_feature(&tensor("head", &[1, 1, 2, 2])?, 2, 0, 2),
        Err(TensorAddressError::SelectionOutOfBounds { .. })
    ));
    Ok(())
}
