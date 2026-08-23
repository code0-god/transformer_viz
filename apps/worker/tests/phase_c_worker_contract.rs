//! Exact Phase C integration through the shared Worker handler.

use nanogpt_schema::{TokenId, WorkerResponse};
use transformer_viz_worker::spike::{WorkerRequest, handle_worker_request};

#[test]
fn run_summary_uses_u64_request_and_native_wasm_tokenizer() -> Result<(), Box<dyn std::error::Error>>
{
    // Given: exact Run JSON with an ID outside u32 range.
    let json = r#"{"type":"run","request_id":4294967296,"text":"the cat"}"#;
    // When: the public Worker boundary decodes and handles it.
    let response = handle_worker_request(serde_json::from_str::<WorkerRequest>(json)?)?;
    // Then: the exact response carries the same ID and deterministic tokenizer output.
    let WorkerResponse::RunComplete {
        request_id,
        summary,
    } = response
    else {
        return Err("expected run-complete response".into());
    };
    assert_eq!(request_id, 4_294_967_296);
    assert_eq!(summary.run_id, request_id);
    assert_eq!(
        summary
            .tokens
            .iter()
            .map(|token| token.id)
            .collect::<Vec<_>>(),
        vec![
            TokenId(0),
            TokenId(119),
            TokenId(107),
            TokenId(104),
            TokenId(35),
            TokenId(102),
            TokenId(100),
            TokenId(119),
            TokenId(1),
        ]
    );
    Ok(())
}
