//! Exact Worker request, response, and `TraceMode` serde variants.

use nanogpt_schema::{TraceMode, WorkerRequest, WorkerResponse};
use serde_json::json;

#[test]
fn worker_request_variants_round_trip_with_exact_u64_flow() -> Result<(), serde_json::Error> {
    // Given: every exact request shape, including IDs above the u32 range.
    let values = [
        json!({"type":"initialize","manifest_url":"model/manifest.json"}),
        json!({"type":"run","request_id":4_294_967_296_u64,"text":"the cat"}),
        json!({"type":"generate","request_id":7,"text":"the cat","config":{"max_new_tokens":24,"temperature":1.0,"top_k":20,"mode":"sample","seed":42}}),
        json!({"type":"stop_generation","request_id":7,"run_id":11}),
        json!({"type":"continue_generation","request_id":7,"run_id":11,"step_index":0}),
        json!({"type":"inspect_generation_step","request_id":8,"generation_run_id":11,"step_index":0}),
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
    let model = json!({
        "model_id":"nanogpt-edu",
        "name":"tiny",
        "corpus":"fixture",
        "nanogpt_commit":"abc",
        "parameter_count":42,
        "architecture": {
            "architecture_id": "nanogpt-decoder-v1",
            "family": "decoder_only",
            "normalization": "layer_norm",
            "norm_placement": "pre_norm",
            "position_encoding": "learned_absolute",
            "attention": {
                "self_attention": "causal_multi_head",
                "cross_attention": false
            },
            "feed_forward": {"kind": "gelu_mlp"},
            "generation": {
                "kind": "autoregressive",
                "kv_cache": false
            },
            "lm_head": {
                "tied_token_embedding": true,
                "bias": false
            },
            "dropout": 0.0
        },
        "config": {
            "block_size":24,
            "vocab_size":259,
            "n_layer":2,
            "n_head":4,
            "n_embd":64,
            "bias":true,
            "dropout":0.0
        }
    });
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
fn generation_stream_variants_round_trip_with_compact_steps() -> Result<(), serde_json::Error> {
    // Given: the complete streaming lifecycle with one compact generation step.
    let values = [
        json!({"type":"generation_started","request_id":7,"run_id":11,"prompt_tokens":[{"id":0,"display":"<BOS>","piece":[],"byte_start":null,"byte_end":null,"kind":"bos"}],"config":{"max_new_tokens":24,"temperature":1.0,"top_k":20,"mode":"sample","seed":42},"context_limit":24}),
        json!({"type":"token_generated","request_id":7,"run_id":11,"step":{"index":0,"context_token_ids":[0,119],"generated_token":{"id":1,"display":"<EOS>","piece":[],"byte_start":null,"byte_end":null,"kind":"eos"},"selected_logit":2.0,"selected_probability":0.75,"candidates":[{"token_id":1,"display":"<EOS>","logit":2.0,"probability":0.75}],"random":0.5,"selected_interval":{"start":0.0,"end":0.75},"forward_ms":1.0,"sampling_ms":0.25,"total_ms":1.25}}),
        json!({"type":"generation_finished","request_id":7,"run_id":11,"reason":"end_of_sequence"}),
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
    // Then: tags and compact machine-consumed fields remain exact.
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
