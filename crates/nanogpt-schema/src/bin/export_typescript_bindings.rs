//! Command-line exporter for the canonical Worker TypeScript bindings.

use nanogpt_schema::export_typescript_bindings;
use std::error::Error;
use std::path::PathBuf;

fn main() -> Result<(), Box<dyn Error>> {
    let mut arguments = std::env::args_os();
    let program = arguments
        .next()
        .map_or_else(|| "export-typescript-bindings".into(), PathBuf::from);
    let Some(output_dir) = arguments.next() else {
        return Err(format!("usage: {} OUTPUT_DIRECTORY", program.display()).into());
    };
    if arguments.next().is_some() {
        return Err(format!("usage: {} OUTPUT_DIRECTORY", program.display()).into());
    }
    export_typescript_bindings(output_dir)?;
    Ok(())
}
