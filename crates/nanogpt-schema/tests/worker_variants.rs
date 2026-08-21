//! Exact Worker request, response, and `TraceMode` serde variants.

use nanogpt_schema::{TraceMode, WorkerRequest, WorkerResponse};
use serde_json::json;

#[test]
fn worker_request_variants_round_trip_with_exact_u64_flow() -> Result<(), serde_json::Error> {
    // Given: every exact request shape, including IDs above the u32 range.
    let values = [
        json!({"type":"initialize","manifest_url":"model/manifest.json"}),
        json!({"type":"run","request_id":4_294_967_296_u64,"text":"the cat"}),
        json!({"type":"inspect_block","request_id":3,"run_id":20,"layer":1}),
        json!({"type":"inspect_attention_head","request_id":4,"run_id":20,"layer":1,"head":2}),
        json!({"type":"inspect_token","request_id":5,"run_id":20,"layer":1,"head":2,"token":3}),
        json!({"type":"cancel","request_id":6}),
    ];
    // When: each request crosses serde in both directions.
    let encoded = values
        .iter()
        .cloned()
        .map(serde_json::from_value::<WorkerRequest>)
        .collect::<Result<Vec<_>, _>>()?
        .into_iter()
        .map(serde_json::to_value)
        .collect::<Result<Vec<_>, _>>()?;
    // Then: all exact fields and 64-bit IDs remain unchanged.
    assert_eq!(encoded, values);
    Ok(())
}

#[test]
fn state_and_error_response_variants_round_trip_with_exact_tags() -> Result<(), serde_json::Error> {
    // Given: exact non-trace response JSON.
    let model =
        json!({"name":"tiny","corpus":"fixture","nanogpt_commit":"abc","parameter_count":42});
    let values = [
        json!({"type":"initializing","phase":"weights"}),
        json!({"type":"ready","model":model}),
        json!({"type":"error","request_id":4_294_967_296_u64,"code":"invalid_request","message":"bad selector"}),
    ];
    // When: each response crosses serde in both directions.
    let encoded = values
        .iter()
        .cloned()
        .map(serde_json::from_value::<WorkerResponse>)
        .collect::<Result<Vec<_>, _>>()?
        .into_iter()
        .map(serde_json::to_value)
        .collect::<Result<Vec<_>, _>>()?;
    // Then: tags, model metadata, and error fields remain exact.
    assert_eq!(encoded, values);
    Ok(())
}

#[test]
fn trace_mode_has_exact_selector_variants() -> Result<(), serde_json::Error> {
    // Given: every allowed TraceMode representation.
    let values = [
        json!({"type":"off"}),
        json!({"type":"summary"}),
        json!({"type":"block","layer":1}),
        json!({"type":"attention_head","layer":1,"head":2}),
        json!({"type":"token","layer":1,"head":2,"token":3}),
    ];
    // When: each selector crosses serde in both directions.
    let encoded = values
        .iter()
        .cloned()
        .map(serde_json::from_value::<TraceMode>)
        .collect::<Result<Vec<_>, _>>()?
        .into_iter()
        .map(serde_json::to_value)
        .collect::<Result<Vec<_>, _>>()?;
    // Then: no alternate selector shape is introduced.
    assert_eq!(encoded, values);
    Ok(())
}
