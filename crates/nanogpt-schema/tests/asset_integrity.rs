//! Educational asset identity, digest, and size contracts.

use nanogpt_schema::{ModelManifest, SchemaError};

const MANIFEST: &str = include_str!("../../../assets/models/edu/manifest.json");

#[test]
fn canonical_manifest_has_complete_bounded_asset_integrity()
-> Result<(), Box<dyn std::error::Error>> {
    let manifest = serde_json::from_str::<ModelManifest>(MANIFEST)?;
    manifest.validate()?;
    assert_eq!(manifest.config_file, "config.json");
    assert_eq!(manifest.tokenizer_file, "tokenizer.json");
    assert_eq!(manifest.weights_file, "model.safetensors");
    assert_eq!(manifest.config_size_bytes, 107);
    assert_eq!(manifest.tokenizer_size_bytes, 118);
    assert_eq!(manifest.weights_size_bytes, 475_432);
    for digest in [
        &manifest.config_sha256,
        &manifest.tokenizer_sha256,
        &manifest.weights_sha256,
    ] {
        assert_eq!(digest.len(), 64);
        assert!(
            digest
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
        );
    }
    Ok(())
}

#[test]
fn manifest_rejects_invalid_digest_size_filename_and_identity() -> Result<(), serde_json::Error> {
    let canonical = serde_json::from_str::<ModelManifest>(MANIFEST)?;
    let mut invalid_digest = canonical.clone();
    invalid_digest.config_sha256 = "A".repeat(64);
    assert!(matches!(
        invalid_digest.validate(),
        Err(SchemaError::InvalidAssetDigest { .. })
    ));

    let mut invalid_size = canonical.clone();
    invalid_size.tokenizer_size_bytes = 0;
    assert!(matches!(
        invalid_size.validate(),
        Err(SchemaError::InvalidAssetSize { .. })
    ));

    let mut invalid_name = canonical.clone();
    invalid_name.weights_file = "../model.safetensors".to_owned();
    assert!(matches!(
        invalid_name.validate(),
        Err(SchemaError::InvalidModelManifest(_))
    ));

    let mut invalid_identity = canonical;
    invalid_identity.model_id = "other".to_owned();
    assert!(matches!(
        invalid_identity.validate(),
        Err(SchemaError::InvalidModelManifest(_))
    ));
    Ok(())
}
