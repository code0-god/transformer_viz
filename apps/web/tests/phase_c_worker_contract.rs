//! Phase C integration through the real shared Worker handler.

use nanogpt_schema::{TokenId, WorkerResponse};
use transformer_viz_web::spike::{WorkerRequest, handle_worker_request};

#[test]
fn tokenizer_response_is_decoded_when_versioned_request_crosses_worker_boundary()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: the concrete Phase C JSON sent to the Worker.
    let json = r#"{"schema_version":"1.0.0","type":"tokenize","request_id":9,"text":"the cat"}"#;
    // When: the public boundary decodes and handles it.
    let response = handle_worker_request(serde_json::from_str::<WorkerRequest>(json)?)?;
    // Then: native and Worker WASM share deterministic token IDs.
    let WorkerResponse::Tokens {
        request_id,
        encoded,
        ..
    } = response
    else {
        return Err("expected token response".into());
    };
    assert_eq!(request_id, 9);
    assert_eq!(
        encoded.ids(),
        vec![
            TokenId(0),
            TokenId(119),
            TokenId(107),
            TokenId(104),
            TokenId(35),
            TokenId(102),
            TokenId(100),
            TokenId(119),
            TokenId(1)
        ]
    );
    Ok(())
}
