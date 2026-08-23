use crate::{WorkerRequest, WorkerResponse};
use std::fmt::Write as _;
use std::path::{Path, PathBuf};
use thiserror::Error;
use ts_rs::{Config, TS as _};

const GENERATED_README: &str = "# Generated Worker schema\n\nThis directory is generated from `nanogpt-schema` by `scripts/generate-typescript-bindings.sh`. Do not edit it manually.\n\nThe transport serializes Rust `u64` values as JavaScript safe-integer `number` values through serde-wasm-bindgen.\n";

/// Failure while exporting the canonical TypeScript Worker schema.
#[derive(Debug, Error)]
pub enum TypeScriptExportError {
    /// A generated binding could not be exported by ts-rs.
    #[error(transparent)]
    Export(#[from] ts_rs::ExportError),
    /// The output directory could not be prepared or indexed.
    #[error(transparent)]
    Io(#[from] std::io::Error),
    /// ts-rs emitted a filename which is not valid UTF-8.
    #[error("generated TypeScript filename is not valid UTF-8: {0:?}")]
    InvalidFileName(PathBuf),
}

/// Exports the complete Worker request/response wire closure and a barrel file.
///
/// Existing output is removed first so regeneration cannot retain orphan bindings.
/// Large Rust integers deliberately map to TypeScript `number`: the Worker boundary uses
/// serde-wasm-bindgen and admits only JavaScript safe integers.
///
/// # Errors
/// Returns [`TypeScriptExportError`] when the destination cannot be replaced or ts-rs cannot
/// export a schema type.
pub fn export_typescript_bindings(
    output_dir: impl AsRef<Path>,
) -> Result<(), TypeScriptExportError> {
    let output_dir = output_dir.as_ref();
    if output_dir.exists() {
        std::fs::remove_dir_all(output_dir)?;
    }
    std::fs::create_dir_all(output_dir)?;

    let config = Config::new()
        .with_large_int("number")
        .with_out_dir(output_dir);
    WorkerRequest::export_all(&config)?;
    WorkerResponse::export_all(&config)?;
    normalize_generated_typescript(output_dir)?;

    let mut names = generated_type_names(output_dir)?;
    names.sort_unstable();

    let mut barrel = String::from(
        "// Generated from nanogpt-schema by scripts/generate-typescript-bindings.sh. Do not edit.\n",
    );
    for name in names {
        writeln!(barrel, "export type {{ {name} }} from \"./{name}\";")
            .map_err(|error| std::io::Error::other(error.to_string()))?;
    }
    std::fs::write(output_dir.join("index.ts"), barrel)?;
    std::fs::write(output_dir.join("README.md"), GENERATED_README)?;
    Ok(())
}

fn normalize_generated_typescript(output_dir: &Path) -> Result<(), TypeScriptExportError> {
    for entry in std::fs::read_dir(output_dir)? {
        let path = entry?.path();
        if path.extension().and_then(|extension| extension.to_str()) != Some("ts") {
            continue;
        }
        let source = std::fs::read_to_string(&path)?;
        let mut normalized = source
            .lines()
            .map(str::trim_end)
            .collect::<Vec<_>>()
            .join("\n");
        normalized.push('\n');
        std::fs::write(path, normalized)?;
    }
    Ok(())
}

fn generated_type_names(output_dir: &Path) -> Result<Vec<String>, TypeScriptExportError> {
    let mut names = Vec::new();
    for entry in std::fs::read_dir(output_dir)? {
        let path = entry?.path();
        if path.extension().and_then(|extension| extension.to_str()) != Some("ts") {
            continue;
        }
        let Some(stem) = path.file_stem().and_then(|stem| stem.to_str()) else {
            return Err(TypeScriptExportError::InvalidFileName(path));
        };
        names.push(stem.to_owned());
    }
    Ok(names)
}
