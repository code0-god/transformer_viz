#!/usr/bin/env bash
set -euo pipefail

readonly ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly OUTPUT_DIR="${1:-${ROOT_DIR}/apps/web/src/generated/schema}"

cd "${ROOT_DIR}"
cargo run --quiet --locked -p nanogpt-schema --features typescript-bindings \
  --bin export-typescript-bindings -- "${OUTPUT_DIR}"
