//! Phase I canonical source-map contract.

use std::path::Path;

use serde_json::Value;

#[test]
fn canonical_source_map_links_pinned_python_ranges_to_rust() -> Result<(), serde_json::Error> {
    // Given: the generated source map shipped with the pinned educational model.
    let map: Value = serde_json::from_str(include_str!("../public/models/edu/source_map.json"))?;

    // When: every educational operation is inspected.
    let operations = map
        .as_object()
        .into_iter()
        .flat_map(|entries| entries.values());

    // Then: each entry names a real Python range and its Rust counterpart.
    let entries = operations.collect::<Vec<_>>();
    assert_eq!(entries.len(), 10);
    let source = include_str!("../public/reference/model.py");
    let source_lines = source.lines().collect::<Vec<_>>();
    let workspace = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    assert!(entries.iter().all(|entry| {
        let range = entry["line_start"]
            .as_u64()
            .zip(entry["line_end"].as_u64())
            .and_then(|(start, end)| {
                let start = usize::try_from(start).ok()?.checked_sub(1)?;
                let end = usize::try_from(end).ok()?;
                source_lines.get(start..end)
            });
        entry["file"] == "reference/model.py"
            && range.is_some_and(|lines| lines.iter().any(|line| !line.trim().is_empty()))
            && entry["rust_file"].as_str().is_some_and(|path| {
                Path::new(path)
                    .extension()
                    .is_some_and(|extension| extension.eq_ignore_ascii_case("rs"))
                    && workspace.join(path).is_file()
            })
            && entry["rust_symbol"]
                .as_str()
                .is_some_and(|symbol| !symbol.is_empty())
    }));
    assert_eq!(
        source,
        include_str!("../../../reference/nanoGPT/model.py"),
        "public source must remain byte-identical to the pinned submodule"
    );
    Ok(())
}
