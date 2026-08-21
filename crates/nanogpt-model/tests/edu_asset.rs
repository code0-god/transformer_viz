//! Smoke coverage for the committed educational model bundle.

use candle_core::Device;
use nanogpt_model::{ForwardRequest, Gpt, NoTrace};
use nanogpt_schema::{GptConfig, TokenizerConfig, TraceMode};
use nanogpt_tokenizer::Tokenizer;

const CONFIG: &str = include_str!("../../../assets/models/edu/config.json");
const TOKENIZER: &str = include_str!("../../../assets/models/edu/tokenizer.json");
const WEIGHTS: &[u8] = include_bytes!("../../../assets/models/edu/model.safetensors");

#[test]
fn edu_asset_loads_when_prompt_is_encoded() -> Result<(), Box<dyn std::error::Error>> {
    // Given: the committed Python-exported model and shared byte tokenizer configuration.
    let config = serde_json::from_str::<GptConfig>(CONFIG)?;
    let tokenizer_config = serde_json::from_str::<TokenizerConfig>(TOKENIZER)?;
    let tokenizer = Tokenizer::new(tokenizer_config)?;
    let model = Gpt::from_safetensors(&config, WEIGHTS, &Device::Cpu)?;
    let ids = tokenizer.encode("the cat sat on the").ids();

    // When: the real committed asset evaluates the shared tokenizer output.
    let output = model.forward(
        ForwardRequest {
            token_ids: &ids,
            top_k: 3,
            trace_mode: TraceMode::Off,
        },
        &mut NoTrace,
    )?;

    // Then: loading and inference succeed with canonical dimensions and finite ranking.
    assert_eq!(output.logits.dims(), &[1, ids.len(), config.vocab_size]);
    assert_eq!(output.top_k.len(), 3);
    assert!(
        output
            .top_k
            .iter()
            .all(|candidate| candidate.logit.is_finite())
    );
    Ok(())
}
