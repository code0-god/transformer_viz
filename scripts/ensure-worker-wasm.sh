#!/usr/bin/env bash
set -euo pipefail

readonly ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly OUTPUT_DIR="${ROOT_DIR}/apps/web/src/generated/worker"

if python3 "${ROOT_DIR}/scripts/worker_artifact_provenance.py" \
  validate "${ROOT_DIR}" "${OUTPUT_DIR}"; then
  printf 'Reusing current production Worker artifacts in %s\n' "${OUTPUT_DIR}"
  exit 0
fi

"${ROOT_DIR}/scripts/build-worker-wasm.sh"
python3 "${ROOT_DIR}/scripts/worker_artifact_provenance.py" \
  validate "${ROOT_DIR}" "${OUTPUT_DIR}"
