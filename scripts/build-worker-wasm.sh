#!/usr/bin/env bash
set -euo pipefail

readonly ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly OUTPUT_DIR="${ROOT_DIR}/apps/web/src/generated/worker"
readonly TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/transformer-viz-worker.XXXXXX")"
readonly WASM_BINDGEN_VERSION="0.2.127"
readonly WASM_OPT_VERSION="123"
trap 'rm -rf "${TEMP_DIR}"' EXIT

find_wasm_opt() {
  if [[ -n "${BINARYEN_ROOT:-}" && -x "${BINARYEN_ROOT}/bin/wasm-opt" ]]; then
    printf '%s\n' "${BINARYEN_ROOT}/bin/wasm-opt"
  elif command -v wasm-opt >/dev/null 2>&1; then
    command -v wasm-opt
  elif [[ -x "${HOME}/Library/Caches/dev.trunkrs.trunk/wasm-opt-version_123/bin/wasm-opt" ]]; then
    printf '%s\n' "${HOME}/Library/Caches/dev.trunkrs.trunk/wasm-opt-version_123/bin/wasm-opt"
  elif [[ -x "${XDG_CACHE_HOME:-${HOME}/.cache}/trunk/wasm-opt-version_123/bin/wasm-opt" ]]; then
    printf '%s\n' "${XDG_CACHE_HOME:-${HOME}/.cache}/trunk/wasm-opt-version_123/bin/wasm-opt"
  else
    printf '%s\n' 'wasm-opt version_123 is required (set BINARYEN_ROOT if it is cached elsewhere).' >&2
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

mkdir -p "${OUTPUT_DIR}"
find "${OUTPUT_DIR}" -mindepth 1 -maxdepth 1 ! -name README.md ! -name .gitignore -exec rm -rf {} +
cp "${TEMP_DIR}"/* "${OUTPUT_DIR}/"
printf 'Generated production Worker artifacts in %s\n' "${OUTPUT_DIR}"
