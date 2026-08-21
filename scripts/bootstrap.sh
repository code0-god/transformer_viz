#!/usr/bin/env bash
set -euo pipefail

readonly RUST_TOOLCHAIN="1.94.0"
readonly WASM_TARGET="wasm32-unknown-unknown"
readonly TRUNK_VERSION="0.21.14"

rustup toolchain install "${RUST_TOOLCHAIN}" --profile minimal --component clippy,rustfmt
rustup target add "${WASM_TARGET}" --toolchain "${RUST_TOOLCHAIN}"

if ! command -v trunk >/dev/null 2>&1 || [[ "$(trunk --version)" != "trunk ${TRUNK_VERSION}" ]]; then
  cargo install trunk --version "${TRUNK_VERSION}" --locked
fi

git submodule update --init --recursive
cargo metadata --no-deps --format-version 1 >/dev/null

printf 'Rust %s, target %s, Trunk %s are ready.\n' \
  "${RUST_TOOLCHAIN}" "${WASM_TARGET}" "${TRUNK_VERSION}"
