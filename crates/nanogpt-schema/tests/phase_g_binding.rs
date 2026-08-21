//! Exact machine-consumed Phase G trace binding fields.

use nanogpt_schema::{
    FiniteF32, LogitsTrace, MaskSnapshot, RunSummary, SchemaVersion, SourceReference,
    TensorSnapshot,
};
use serde_json::json;

#[test]
fn trace_dtos_use_exact_binding_names_and_stable_statistics()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: a finite 3-4 vector, mask, and source reference.
    let snapshot = TensorSnapshot::new(
        "tensor-id".to_owned(),
        vec![2],
        vec![FiniteF32::new(3.0)?, FiniteF32::new(4.0)?],
    )?;
    let mask = MaskSnapshot::new(1, 2, vec![true, false])?;
    let source = SourceReference {
        file: "model.py".to_owned(),
        start_line: 10,
        end_line: 12,
        symbol: "forward".to_owned(),
    };

    // When: the DTOs cross the JSON boundary.
    let snapshot_json = serde_json::to_value(snapshot)?;
    let mask_json = serde_json::to_value(mask)?;
    let source_json = serde_json::to_value(source)?;

    // Then: exact field names and population statistics match the binding contract.
    assert_eq!(
        snapshot_json,
        json!({
            "id": "tensor-id",
            "label": "tensor-id",
            "shape": [2],
            "values": [3.0, 4.0],
            "stats": { "min": 3.0, "max": 4.0, "mean": 3.5, "std": 0.5, "l2_norm": 5.0 }
        })
    );
    assert_eq!(
        mask_json,
        json!({ "rows": 1, "cols": 2, "allowed": [true, false] })
    );
    assert_eq!(
        source_json,
        json!({ "file": "model.py", "symbol": "forward", "start_line": 10, "end_line": 12 })
    );
    Ok(())
}

#[test]
fn run_summary_serializes_finite_duration_ms() -> Result<(), Box<dyn std::error::Error>> {
    // Given: a complete current summary.
    let snapshot = TensorSnapshot::new("logits".to_owned(), vec![1], vec![FiniteF32::new(0.0)?])?;
    let summary = RunSummary {
        schema_version: SchemaVersion::current(),
        run_id: 1,
        tokens: Vec::new(),
        layers: Vec::new(),
        duration_ms: FiniteF32::new(12.5)?,
        logits: LogitsTrace {
            logits: snapshot,
            top_k: Vec::new(),
            source: SourceReference {
                file: "model.py".to_owned(),
                start_line: 1,
                end_line: 1,
                symbol: "forward".to_owned(),
            },
        },
    };

    // When: it crosses the Worker JSON boundary.
    let value = serde_json::to_value(summary)?;

    // Then: measured duration is present and finite.
    assert_eq!(value["duration_ms"], json!(12.5));
    Ok(())
}
