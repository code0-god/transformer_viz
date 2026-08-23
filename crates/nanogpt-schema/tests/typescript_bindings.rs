#![cfg(feature = "typescript-bindings")]
//! Generated TypeScript binding freshness and machine-contract tests.

use nanogpt_schema::export_typescript_bindings;
use std::collections::BTreeMap;
use std::error::Error;
use std::path::{Path, PathBuf};

const COMMITTED_BINDINGS: &str = "../../apps/web/src/generated/schema";

#[test]
fn committed_typescript_bindings_are_exactly_current() -> Result<(), Box<dyn Error>> {
    let temporary = tempfile::tempdir()?;
    export_typescript_bindings(temporary.path())?;

    let generated = files_by_relative_path(temporary.path())?;
    let committed = files_by_relative_path(&committed_bindings_path())?;
    assert_eq!(generated, committed);
    Ok(())
}

#[test]
fn generated_machine_contract_is_exact() -> Result<(), Box<dyn Error>> {
    let root = committed_bindings_path();

    assert_eq!(
        declaration(&root, "SchemaVersion")?,
        "export type SchemaVersion = \"1.1.0\";"
    );
    assert_eq!(
        declaration(&root, "SamplingMode")?,
        "export type SamplingMode = \"greedy\" | \"sample\";"
    );
    assert_eq!(
        declaration(&root, "TokenKind")?,
        "export type TokenKind = \"bos\" | \"byte\" | \"eos\" | \"unknown\";"
    );
    assert_eq!(
        declaration(&root, "GenerationStopReason")?,
        "export type GenerationStopReason = \"max_new_tokens\" | \"end_of_sequence\" | \"context_limit\" | \"user_stopped\" | \"replaced\" | \"error\";"
    );
    assert_eq!(
        declaration(&root, "WorkerErrorCode")?,
        "export type WorkerErrorCode = \"unsupported_version\" | \"invalid_request\" | \"not_initialized\" | \"asset_unavailable\" | \"checksum_mismatch\" | \"tokenization\" | \"inference\" | \"cancelled\";"
    );

    let request = binding(&root, "WorkerRequest")?;
    let response = binding(&root, "WorkerResponse")?;
    for discriminant in [
        "initialize",
        "run",
        "generate",
        "stop_generation",
        "continue_generation",
        "inspect_generation_step",
        "inspect_block",
        "inspect_attention_head",
        "inspect_token",
        "cancel",
    ] {
        assert!(request.contains(&format!("\"type\": \"{discriminant}\"")));
    }
    for discriminant in [
        "initializing",
        "ready",
        "generation_started",
        "token_generated",
        "generation_finished",
        "generation_step_trace",
        "run_complete",
        "block_trace",
        "attention_head_trace",
        "token_trace",
        "error",
    ] {
        assert!(response.contains(&format!("\"type\": \"{discriminant}\"")));
    }
    assert!(response.contains("request_id: number | null"));

    for (type_name, field) in [
        ("WorkerRequest", "request_id"),
        ("WorkerRequest", "run_id"),
        ("WorkerRequest", "generation_run_id"),
        ("WorkerResponse", "request_id"),
        ("WorkerResponse", "run_id"),
        ("WorkerResponse", "generation_run_id"),
        ("GenerationConfig", "seed"),
        ("ModelMetadata", "parameter_count"),
        ("RunSummary", "run_id"),
        ("BlockTrace", "run_id"),
        ("TokenTrace", "run_id"),
    ] {
        assert!(
            binding(&root, type_name)?.contains(&format!("{field}: number")),
            "{type_name}.{field} must be a TypeScript number"
        );
    }
    for contents in files_by_relative_path(&root)?.values() {
        assert!(!String::from_utf8_lossy(contents).contains("bigint"));
    }
    Ok(())
}

fn committed_bindings_path() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join(COMMITTED_BINDINGS)
}

fn binding(root: &Path, type_name: &str) -> Result<String, Box<dyn Error>> {
    Ok(std::fs::read_to_string(
        root.join(format!("{type_name}.ts")),
    )?)
}

fn declaration(root: &Path, type_name: &str) -> Result<String, Box<dyn Error>> {
    let contents = binding(root, type_name)?;
    contents
        .lines()
        .find(|line| line.starts_with("export type "))
        .map(str::to_owned)
        .ok_or_else(|| format!("{type_name}.ts has no exported declaration").into())
}

fn files_by_relative_path(root: &Path) -> Result<BTreeMap<PathBuf, Vec<u8>>, Box<dyn Error>> {
    let mut files = BTreeMap::new();
    collect_files(root, root, &mut files)?;
    Ok(files)
}

fn collect_files(
    root: &Path,
    directory: &Path,
    files: &mut BTreeMap<PathBuf, Vec<u8>>,
) -> Result<(), Box<dyn Error>> {
    for entry in std::fs::read_dir(directory)? {
        let path = entry?.path();
        if path.is_dir() {
            collect_files(root, &path, files)?;
        } else {
            files.insert(path.strip_prefix(root)?.to_owned(), std::fs::read(path)?);
        }
    }
    Ok(())
}
