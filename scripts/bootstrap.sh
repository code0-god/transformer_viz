#!/usr/bin/env bash
set -euo pipefail

readonly ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly RUST_TOOLCHAIN="1.94.0"
readonly WASM_TARGET="wasm32-unknown-unknown"
readonly WASM_BINDGEN_VERSION="0.2.127"
readonly NODE_VERSION="$(tr -d '\n' < "${ROOT_DIR}/.node-version")"
readonly PNPM_VERSION="11.22.0"

for command in git rustup cargo node npm; do
  command -v "${command}" >/dev/null 2>&1 || {
    printf 'Required command is missing: %s\n' "${command}" >&2
    exit 1
  }
done
[[ "$(node --version)" == "v${NODE_VERSION}" ]] || {
  printf 'Node must be exactly %s (see .node-version).\n' "${NODE_VERSION}" >&2
  exit 1
}

rustup toolchain install "${RUST_TOOLCHAIN}" --profile minimal --component clippy,rustfmt
rustup target add "${WASM_TARGET}" --toolchain "${RUST_TOOLCHAIN}"
if ! command -v wasm-bindgen >/dev/null 2>&1 || \
  [[ "$(wasm-bindgen --version)" != "wasm-bindgen ${WASM_BINDGEN_VERSION}" ]]; then
  cargo install wasm-bindgen-cli --version "${WASM_BINDGEN_VERSION}" --locked --force
fi
if ! command -v pnpm >/dev/null 2>&1 || [[ "$(pnpm --version)" != "${PNPM_VERSION}" ]]; then
  npm install --global "pnpm@${PNPM_VERSION}"
fi

cd "${ROOT_DIR}"
git submodule update --init --recursive
cargo metadata --no-deps --format-version 1 >/dev/null
pnpm install --frozen-lockfile
[[ "$(node_modules/.bin/wasm-opt --version)" =~ version[[:space:]]123([^0-9]|$) ]] || {
  printf '%s\n' 'The workspace Binaryen package must provide wasm-opt version 123.' >&2
  exit 1
}

printf 'Rust %s, %s, wasm-bindgen %s, Node %s, pnpm %s, and Binaryen 123.0.0 are ready.\n' \
  "${RUST_TOOLCHAIN}" "${WASM_TARGET}" "${WASM_BINDGEN_VERSION}" \
  "${NODE_VERSION}" "${PNPM_VERSION}"
