#!/usr/bin/env bash
set -euo pipefail

readonly ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly OUTPUT_DIR="${ROOT_DIR}/apps/web/src/generated/worker"
readonly TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/transformer-viz-worker.XXXXXX")"
readonly REQUIRED_ARTIFACTS=(worker.js worker.d.ts worker_bg.wasm)
readonly PROVENANCE_MANIFEST="worker.provenance.json"
readonly WASM_BINDGEN_VERSION="0.2.127"
readonly WASM_OPT_VERSION="123"
trap 'rm -rf "${TEMP_DIR}"' EXIT

find_wasm_opt() {
  if [[ -x "${ROOT_DIR}/node_modules/.bin/wasm-opt" ]]; then
    printf '%s\n' "${ROOT_DIR}/node_modules/.bin/wasm-opt"
  elif [[ -n "${BINARYEN_ROOT:-}" && -x "${BINARYEN_ROOT}/bin/wasm-opt" ]]; then
    printf '%s\n' "${BINARYEN_ROOT}/bin/wasm-opt"
  elif command -v wasm-opt >/dev/null 2>&1; then
    command -v wasm-opt
  else
    printf '%s\n' 'Binaryen 123.0.0 is required; run pnpm install --frozen-lockfile.' >&2
    return 1
  fi
}

for command in cargo wasm-bindgen; do
  command -v "${command}" >/dev/null 2>&1 || { printf 'Required command is missing: %s\n' "${command}" >&2; exit 1; }
done
[[ "$(wasm-bindgen --version)" == "wasm-bindgen ${WASM_BINDGEN_VERSION}" ]] || {
  printf 'wasm-bindgen must be exactly %s\n' "${WASM_BINDGEN_VERSION}" >&2
  exit 1
}
readonly WASM_OPT="$(find_wasm_opt)"
"${WASM_OPT}" --version | grep -Eq "version ${WASM_OPT_VERSION}([^0-9]|$)" || {
  printf 'wasm-opt must be Binaryen version_%s\n' "${WASM_OPT_VERSION}" >&2
  exit 1
}

cd "${ROOT_DIR}"
cargo build --locked --release -p transformer-viz-worker --bin worker --target wasm32-unknown-unknown
wasm-bindgen \
  --target web \
  --typescript \
  --out-dir "${TEMP_DIR}" \
  --out-name worker \
  "${ROOT_DIR}/target/wasm32-unknown-unknown/release/worker.wasm"
"${WASM_OPT}" -Oz "${TEMP_DIR}/worker_bg.wasm" -o "${TEMP_DIR}/worker_bg.optimized.wasm"
mv "${TEMP_DIR}/worker_bg.optimized.wasm" "${TEMP_DIR}/worker_bg.wasm"
python3 "${ROOT_DIR}/scripts/worker_artifact_provenance.py" write "${ROOT_DIR}" "${TEMP_DIR}"

mkdir -p "${OUTPUT_DIR}"
for artifact in "${REQUIRED_ARTIFACTS[@]}" "${PROVENANCE_MANIFEST}"; do
  cp "${TEMP_DIR}/${artifact}" "${OUTPUT_DIR}/.${artifact}.installing"
done
for artifact in "${REQUIRED_ARTIFACTS[@]}"; do
  mv "${OUTPUT_DIR}/.${artifact}.installing" "${OUTPUT_DIR}/${artifact}"
done
# The manifest is the commit marker: interrupted installs cannot validate as coherent.
mv "${OUTPUT_DIR}/.${PROVENANCE_MANIFEST}.installing" "${OUTPUT_DIR}/${PROVENANCE_MANIFEST}"
find "${OUTPUT_DIR}" -mindepth 1 -maxdepth 1 \
  ! -name README.md ! -name .gitignore \
  ! -name "${PROVENANCE_MANIFEST}" \
  ! -name worker.js ! -name worker.d.ts ! -name worker_bg.wasm \
  -exec rm -rf {} +
printf 'Generated production Worker artifacts in %s\n' "${OUTPUT_DIR}"
