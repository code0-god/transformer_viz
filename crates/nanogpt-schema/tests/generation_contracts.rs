//! Generation configuration boundary contracts.

use nanogpt_schema::{GenerationConfig, SamplingMode, SchemaError, Temperature, TopK};
use serde_json::json;

#[test]
fn sampling_modes_serialize_as_stable_variants() -> Result<(), Box<dyn std::error::Error>> {
    // Given: both supported token-selection modes.
    let modes = [SamplingMode::Greedy, SamplingMode::Sample];
    // When: each mode crosses the JSON boundary.
    let serialized = modes
        .into_iter()
        .map(serde_json::to_value)
        .collect::<Result<Vec<_>, _>>()?;
    // Then: the machine-consumed names remain explicit and round-trip.
    assert_eq!(serialized, vec![json!("greedy"), json!("sample")]);
    assert_eq!(
        serde_json::from_value::<SamplingMode>(json!("greedy"))?,
        SamplingMode::Greedy
    );
    assert_eq!(
        serde_json::from_value::<SamplingMode>(json!("sample"))?,
        SamplingMode::Sample
    );
    Ok(())
}

#[test]
fn generation_config_default_has_a_stable_boundary_shape() -> Result<(), Box<dyn std::error::Error>>
{
    // Given: the canonical generation defaults.
    let config = GenerationConfig::default();
    // When: the config is serialized and deserialized.
    let value = serde_json::to_value(&config)?;
    let round_trip = serde_json::from_value::<GenerationConfig>(value.clone())?;
    // Then: every generation control is present with a typed default.
    assert_eq!(
        value,
        json!({
            "max_new_tokens": 24,
            "temperature": 1.0,
            "top_k": 20,
            "mode": "sample",
            "seed": 42
        })
    );
    assert_eq!(round_trip, config);
    Ok(())
}

#[test]
fn generation_config_rejects_invalid_temperature_and_zero_top_k() {
    // Given: zero, negative, and non-finite temperatures plus an empty Top-K.
    let temperatures = [0.0, -0.25, f32::NAN, f32::INFINITY, f32::NEG_INFINITY];
    // When: values cross their typed constructors.
    let results = temperatures.map(Temperature::new);
    let top_k = TopK::new(0);
    // Then: invalid generation states cannot be represented.
    assert!(
        results
            .into_iter()
            .all(|result| result == Err(SchemaError::InvalidTemperature))
    );
    assert_eq!(top_k, Err(SchemaError::ZeroValue { field: "top_k" }));
}

#[test]
fn generation_config_rejects_invalid_values_during_deserialization() {
    // Given: boundary payloads with zero temperature or zero Top-K.
    let zero_temperature = json!({
        "max_new_tokens": 1,
        "temperature": 0.0,
        "top_k": 1,
        "mode": "sample",
        "seed": 9
    });
    let zero_top_k = json!({
        "max_new_tokens": 1,
        "temperature": 1.0,
        "top_k": 0,
        "mode": "greedy",
        "seed": 9
    });
    // When: each payload is parsed as a generation config.
    let temperature_result = serde_json::from_value::<GenerationConfig>(zero_temperature);
    let top_k_result = serde_json::from_value::<GenerationConfig>(zero_top_k);
    // Then: Serde preserves constructor validation at the trust boundary.
    assert!(temperature_result.is_err());
    assert!(top_k_result.is_err());
}
