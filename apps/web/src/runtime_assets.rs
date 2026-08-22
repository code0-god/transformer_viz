//! Model asset parsing and integrity verification.

use candle_core::Device;
use nanogpt_model::Gpt;
use nanogpt_schema::{GptConfig, ModelManifest, ModelMetadata};
use nanogpt_tokenizer::Tokenizer;
use sha2::{Digest as _, Sha256};

use crate::runtime_error::RuntimeError;

/// Fully downloaded same-origin model assets.
#[derive(Debug)]
pub struct AssetBundle {
    /// UTF-8 manifest JSON.
    pub manifest: String,
    /// UTF-8 architecture JSON.
    pub config: String,
    /// UTF-8 tokenizer JSON.
    pub tokenizer: String,
    /// Canonical safetensors bytes.
    pub weights: Vec<u8>,
}

#[derive(Debug)]
pub(super) struct LoadedModel {
    pub(super) config: GptConfig,
    pub(super) tokenizer: Tokenizer,
    pub(super) model: Gpt,
}

pub(super) fn load_assets(
    assets: &AssetBundle,
) -> Result<(LoadedModel, ModelMetadata), RuntimeError> {
    let manifest = serde_json::from_str::<ModelManifest>(&assets.manifest)
        .map_err(|error| RuntimeError::InvalidAsset(error.to_string()))?;
    let actual = format!("{:x}", Sha256::digest(&assets.weights));
    if actual != manifest.weights_sha256 {
        return Err(RuntimeError::ChecksumMismatch {
            expected: manifest.weights_sha256,
            actual,
        });
    }
    let config = serde_json::from_str::<GptConfig>(&assets.config)
        .map_err(|error| RuntimeError::InvalidAsset(error.to_string()))?;
    if config.block_size != manifest.max_sequence_length {
        return Err(RuntimeError::InvalidAsset(
            "manifest and model context lengths differ".to_owned(),
        ));
    }
    let tokenizer = Tokenizer::from_json(&assets.tokenizer)?;
    if tokenizer.config().max_length != config.block_size {
        return Err(RuntimeError::InvalidAsset(
            "tokenizer and model context lengths differ".to_owned(),
        ));
    }
    let model = Gpt::from_safetensors(&config, &assets.weights, &Device::Cpu)?;
    let metadata = ModelMetadata {
        name: manifest.display_name,
        corpus: "CC0 educational corpus".to_owned(),
        nanogpt_commit: manifest.nanogpt_commit,
        parameter_count: manifest.parameter_count,
        config: config.clone(),
    };
    Ok((
        LoadedModel {
            config,
            tokenizer,
            model,
        },
        metadata,
    ))
}

pub(super) fn asset_names(manifest: &str) -> Result<(String, String, String), RuntimeError> {
    let manifest = serde_json::from_str::<ModelManifest>(manifest)
        .map_err(|error| RuntimeError::InvalidAsset(error.to_string()))?;
    Ok((
        manifest.config_file,
        manifest.tokenizer_file,
        manifest.weights_file,
    ))
}
