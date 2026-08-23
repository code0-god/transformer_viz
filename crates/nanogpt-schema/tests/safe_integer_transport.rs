//! JavaScript safe-integer transport contracts for Worker IDs and seeds.

//! Safe-integer Worker protocol round-trip contracts.

use nanogpt_schema::{GenerationConfig, WorkerRequest, WorkerResponse};
use serde_json::json;
use std::error::Error;

const JAVASCRIPT_MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;

#[test]
fn worker_request_safe_integer_boundary_round_trips() -> Result<(), Box<dyn Error>> {
    let request = WorkerRequest::Generate {
        request_id: JAVASCRIPT_MAX_SAFE_INTEGER,
        text: "safe boundary".to_owned(),
        config: GenerationConfig {
            seed: JAVASCRIPT_MAX_SAFE_INTEGER,
            ..GenerationConfig::default()
        },
    };

    let encoded = serde_json::to_value(&request)?;
    assert_eq!(encoded["request_id"], json!(JAVASCRIPT_MAX_SAFE_INTEGER));
    assert_eq!(
        encoded["config"]["seed"],
        json!(JAVASCRIPT_MAX_SAFE_INTEGER)
    );
    assert_eq!(serde_json::from_value::<WorkerRequest>(encoded)?, request);
    Ok(())
}

#[test]
fn worker_response_safe_integer_and_nullable_request_id_round_trip() -> Result<(), Box<dyn Error>> {
    let response = WorkerResponse::Error {
        request_id: Some(JAVASCRIPT_MAX_SAFE_INTEGER),
        code: nanogpt_schema::WorkerErrorCode::InvalidRequest,
        message: "safe boundary".to_owned(),
    };
    let encoded = serde_json::to_value(&response)?;
    assert_eq!(encoded["request_id"], json!(JAVASCRIPT_MAX_SAFE_INTEGER));
    assert_eq!(serde_json::from_value::<WorkerResponse>(encoded)?, response);

    let uncorrelated = WorkerResponse::Error {
        request_id: None,
        code: nanogpt_schema::WorkerErrorCode::InvalidRequest,
        message: "uncorrelated".to_owned(),
    };
    let encoded = serde_json::to_value(&uncorrelated)?;
    assert!(encoded["request_id"].is_null());
    assert_eq!(
        serde_json::from_value::<WorkerResponse>(encoded)?,
        uncorrelated
    );
    Ok(())
}
