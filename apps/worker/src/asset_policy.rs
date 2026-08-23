//! Pure lexical gates shared by Worker asset URL enforcement and native tests.

/// Returns whether initialization names the one deployment-relative educational manifest.
#[must_use]
pub fn canonical_manifest_request(value: &str) -> bool {
    value == "./models/edu/manifest.json"
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
    use super::*;

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
}
