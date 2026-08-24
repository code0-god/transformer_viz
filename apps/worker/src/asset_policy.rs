//! Pure lexical gates shared by Worker asset URL enforcement and native tests.

/// SHA-256 identity of the canonical educational manifest.
pub const EXPECTED_MANIFEST_SHA256: &str =
    "a9dc4cab09f2b86e3ed5eeb76c02dcd7301eb98686d022bd564ea94faa4ec266";

/// Returns whether initialization names the one deployment-relative educational manifest.
#[must_use]
pub fn canonical_manifest_request(value: &str) -> bool {
    value == "./models/edu/manifest.json"
}

/// Derives the deployment root from either root-level or Vite `assets/` Worker output.
#[must_use]
pub fn deployment_path_from_worker_path(pathname: &str) -> Option<&str> {
    let (worker_directory, filename) = pathname.rsplit_once('/')?;
    if filename.is_empty() {
        return None;
    }
    Some(
        worker_directory
            .strip_suffix("/assets")
            .unwrap_or(worker_directory),
    )
}

/// Returns whether a manifest child is one of the three canonical educational assets.
#[must_use]
pub fn canonical_child_filename(value: &str) -> bool {
    matches!(
        value,
        "config.json" | "tokenizer.json" | "model.safetensors"
    )
}

/// Returns whether raw URL syntax could obscure origin, path, query, or fragment identity.
#[must_use]
pub fn has_url_escape(value: &str) -> bool {
    value.contains(['%', '\\', '#', '?'])
}

/// Returns whether a declared or allocated asset size obeys its fixed and exact bounds.
#[must_use]
pub fn bounded_asset_size(size: u64, maximum: u64, exact: Option<u64>) -> bool {
    size > 0 && size <= maximum && exact.is_none_or(|expected| expected == size)
}

#[cfg(test)]
mod tests {
    use sha2::{Digest as _, Sha256};

    use super::*;

    #[test]
    fn expected_manifest_digest_matches_canonical_asset() {
        let manifest = include_bytes!("../../../assets/models/edu/manifest.json");
        assert_eq!(
            EXPECTED_MANIFEST_SHA256,
            format!("{:x}", Sha256::digest(manifest))
        );
    }

    #[test]
    fn manifest_request_rejects_absolute_traversal_encoded_and_unexpected_paths() {
        assert!(canonical_manifest_request("./models/edu/manifest.json"));
        for hostile in [
            "https://attacker.invalid/models/edu/manifest.json",
            "../models/edu/manifest.json",
            "./models/edu/%2e%2e/manifest.json",
            "/models/edu/manifest.json",
            "./models/other/manifest.json",
        ] {
            assert!(!canonical_manifest_request(hostile));
        }
    }

    #[test]
    fn child_names_and_escape_syntax_are_exact() {
        for canonical in ["config.json", "tokenizer.json", "model.safetensors"] {
            assert!(canonical_child_filename(canonical));
            assert!(!has_url_escape(canonical));
        }
        for hostile in [
            "https://attacker.invalid/config.json",
            "../config.json",
            "%2e%2e/config.json",
            "config.json#ignored",
            "other.safetensors",
        ] {
            assert!(!canonical_child_filename(hostile));
        }
        assert!(has_url_escape("%2e%2e/config.json"));
        assert!(has_url_escape("config.json#ignored"));
    }

    #[test]
    fn asset_sizes_reject_zero_oversized_and_manifest_mismatch() {
        assert!(bounded_asset_size(107, 64 * 1024, Some(107)));
        assert!(!bounded_asset_size(0, 64 * 1024, None));
        assert!(!bounded_asset_size(64 * 1024 + 1, 64 * 1024, None));
        assert!(!bounded_asset_size(106, 64 * 1024, Some(107)));
    }

    #[test]
    fn worker_paths_resolve_root_and_project_vite_asset_directories() {
        assert_eq!(
            deployment_path_from_worker_path("/assets/worker-entry.js"),
            Some("")
        );
        assert_eq!(
            deployment_path_from_worker_path("/transformer_viz/assets/worker-entry.js"),
            Some("/transformer_viz")
        );
        assert_eq!(
            deployment_path_from_worker_path("/transformer_viz/worker.js"),
            Some("/transformer_viz")
        );
        assert_eq!(deployment_path_from_worker_path("/assets/"), None);
    }
}
