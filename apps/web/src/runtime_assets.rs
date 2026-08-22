//! Model asset parsing and integrity verification.

use candle_core::Device;
use nanogpt_model::{Gpt, stored_parameter_count};
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
    manifest.validate()?;
    verify_asset(
        assets.config.as_bytes(),
        manifest.config_size_bytes,
        &manifest.config_sha256,
    )?;
    verify_asset(
        assets.tokenizer.as_bytes(),
        manifest.tokenizer_size_bytes,
        &manifest.tokenizer_sha256,
    )?;
    verify_asset(
        &assets.weights,
        manifest.weights_size_bytes,
        &manifest.weights_sha256,
    )?;
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
    let stored_count = stored_parameter_count(&assets.weights)?;
    if stored_count != manifest.parameter_count {
        return Err(RuntimeError::InvalidAsset(format!(
            "manifest parameter count {} differs from stored tensor element count {stored_count}",
            manifest.parameter_count
        )));
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

fn verify_asset(
    bytes: &[u8],
    expected_size: u64,
    expected_digest: &str,
) -> Result<(), RuntimeError> {
    let actual_size = u64::try_from(bytes.len())
        .map_err(|_| RuntimeError::InvalidAsset("asset size exceeds u64".to_owned()))?;
    if actual_size != expected_size {
        return Err(RuntimeError::InvalidAsset(format!(
            "asset size {actual_size} differs from manifest size {expected_size}"
        )));
    }
    let actual = format!("{:x}", Sha256::digest(bytes));
    if actual != expected_digest {
        return Err(RuntimeError::ChecksumMismatch {
            expected: expected_digest.to_owned(),
            actual,
        });
    }
    Ok(())
}

pub(super) fn asset_names(manifest: &str) -> Result<(String, String, String), RuntimeError> {
    let manifest = serde_json::from_str::<ModelManifest>(manifest)
        .map_err(|error| RuntimeError::InvalidAsset(error.to_string()))?;
    manifest.validate()?;
    Ok((
        manifest.config_file,
        manifest.tokenizer_file,
        manifest.weights_file,
    ))
}

#[cfg(test)]
mod integrity_tests {
    use super::*;

    fn assets() -> AssetBundle {
        AssetBundle {
            manifest: include_str!("../public/models/edu/manifest.json").to_owned(),
            config: include_str!("../public/models/edu/config.json").to_owned(),
            tokenizer: include_str!("../public/models/edu/tokenizer.json").to_owned(),
            weights: include_bytes!("../public/models/edu/model.safetensors").to_vec(),
        }
    }

    #[test]
    fn raw_config_and_tokenizer_digest_mismatches_are_rejected_before_parsing() {
        let mut config = assets();
        config.config.pop();
        config.config.push(' ');
        assert!(matches!(
            load_assets(&config),
            Err(RuntimeError::ChecksumMismatch { .. })
        ));

        let mut tokenizer = assets();
        tokenizer.tokenizer.pop();
        tokenizer.tokenizer.push(' ');
        assert!(matches!(
            load_assets(&tokenizer),
            Err(RuntimeError::ChecksumMismatch { .. })
        ));
    }

    #[test]
    fn manifest_parameter_count_must_equal_unique_stored_elements() -> Result<(), serde_json::Error>
    {
        let mut assets = assets();
        let mut manifest = serde_json::from_str::<ModelManifest>(&assets.manifest)?;
        manifest.parameter_count += 1;
        assets.manifest = serde_json::to_string(&manifest)?;
        assert!(
            matches!(load_assets(&assets), Err(RuntimeError::InvalidAsset(message)) if message.contains("parameter"))
        );
        Ok(())
    }
}
