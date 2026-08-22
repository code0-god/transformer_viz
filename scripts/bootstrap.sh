#!/usr/bin/env bash
set -euo pipefail

readonly RUST_TOOLCHAIN="1.94.0"
readonly WASM_TARGET="wasm32-unknown-unknown"
readonly TRUNK_VERSION="0.21.14"
readonly ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "${ROOT_DIR}"

for command in git rustup cargo; do
  if ! command -v "${command}" >/dev/null 2>&1; then
    printf 'Required command is missing: %s\n' "${command}" >&2
    exit 1
  fi
done

rustup toolchain install "${RUST_TOOLCHAIN}" --profile minimal --component clippy,rustfmt
rustup target add "${WASM_TARGET}" --toolchain "${RUST_TOOLCHAIN}"

if ! command -v trunk >/dev/null 2>&1 || [[ "$(trunk --version)" != "trunk ${TRUNK_VERSION}" ]]; then
  cargo install trunk --version "${TRUNK_VERSION}" --locked --force
fi

git submodule update --init --recursive
cargo metadata --no-deps --format-version 1 >/dev/null

printf 'Rust %s, target %s, Trunk %s are ready.\n' \
  "${RUST_TOOLCHAIN}" "${WASM_TARGET}" "${TRUNK_VERSION}"
