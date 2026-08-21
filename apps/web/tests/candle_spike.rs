//! Phase B Candle operation contract retained through the shared schema.

use nanogpt_schema::{FiniteF32, SchemaVersion};
use transformer_viz_web::spike::{WorkerRequest, WorkerResponse, handle_worker_request};

fn assert_close(actual: &[FiniteF32], expected: &[f32]) {
    assert_eq!(actual.len(), expected.len());
    for (actual, expected) in actual.iter().zip(expected) {
        assert!(
            (actual.get() - expected).abs() < 1e-5,
            "{} != {expected}",
            actual.get()
        );
    }
}

#[test]
fn candle_results_are_typed_when_worker_runs_cpu_spike() -> Result<(), Box<dyn std::error::Error>> {
    // Given: a shared request sent across the browser Worker boundary.
    let request = WorkerRequest::RunOperations {
        schema_version: SchemaVersion::current(),
        request_id: 7,
    };
    // When: Candle evaluates the Phase B CPU operation graph.
    let response = handle_worker_request(request)?;
    // Then: every required operation is returned as finite typed tensor data.
    let WorkerResponse::OperationResult {
        request_id, result, ..
    } = response
    else {
        return Err("expected an operation result response".into());
    };
    assert_eq!(request_id, 7);
    assert_eq!(result.backend, "Candle CPU");
    assert_eq!(result.matmul.shape, [2, 2]);
    assert_close(&result.matmul.values, &[19.0, 22.0, 43.0, 50.0]);
    assert_eq!(result.reshape.shape, [4]);
    assert_close(&result.reshape.values, &[19.0, 22.0, 43.0, 50.0]);
    assert_eq!(result.transpose.shape, [2, 2]);
    assert_close(&result.transpose.values, &[19.0, 43.0, 22.0, 50.0]);
    assert_close(
        &result.softmax.values,
        &[0.047_425_874, 0.952_574_13, 0.000_911_052, 0.999_089],
    );
    assert_close(
        &result.layer_norm.values,
        &[-0.999_997_8, 0.999_997_8, -0.999_999_6, 0.999_999_6],
    );
    assert_close(
        &result.gelu.values,
        &[-0.158_655_26, 0.0, 0.841_344_7, 1.954_499_7],
    );
    Ok(())
}
