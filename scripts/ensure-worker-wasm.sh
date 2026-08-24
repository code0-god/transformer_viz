#!/usr/bin/env bash
set -euo pipefail

readonly ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly OUTPUT_DIR="${ROOT_DIR}/apps/web/src/generated/worker"
readonly REQUIRED_ARTIFACTS=(worker.js worker.d.ts worker_bg.wasm)

for artifact in "${REQUIRED_ARTIFACTS[@]}"; do
  if [[ ! -f "${OUTPUT_DIR}/${artifact}" ]]; then
    exec "${ROOT_DIR}/scripts/build-worker-wasm.sh"
  fi
done

printf 'Reusing production Worker artifacts in %s\n' "${OUTPUT_DIR}"
