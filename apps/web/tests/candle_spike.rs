//! Phase B Candle operation contract retained beside the exact Worker schema.

use nanogpt_schema::FiniteF32;
use transformer_viz_web::spike::run_candle_spike;

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
fn candle_results_remain_finite_when_cpu_spike_runs() -> Result<(), Box<dyn std::error::Error>> {
    // Given: the retained deterministic Candle operation graph.
    // When: it executes through the same code compiled into Worker WASM.
    let result = run_candle_spike()?;
    // Then: every Phase B operation remains represented by finite snapshots.
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
