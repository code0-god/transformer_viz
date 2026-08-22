#!/usr/bin/env bash
set -euo pipefail

readonly ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

printf '%s\n' '==> rustfmt'
cargo fmt --all -- --check

printf '%s\n' '==> Clippy (native workspace)'
# Clippy runs natively across every package and target. The browser package is checked separately
# below because Cargo cannot compile native-only transitive dependencies for the WASM target.
cargo clippy --workspace --all-targets --all-features -- -D warnings

printf '%s\n' '==> workspace tests'
cargo test --workspace

printf '%s\n' '==> root workspace release build'
cargo build --workspace --release

printf '%s\n' '==> browser package (wasm32-unknown-unknown)'
cargo check --target wasm32-unknown-unknown -p transformer-viz-web

printf '%s\n' '==> canonical assets'
for asset in config.json manifest.json model.safetensors SHA256SUMS source_map.json tokenizer.json; do
  cmp "assets/models/edu/${asset}" "apps/web/public/models/edu/${asset}"
done
(cd assets/models/edu && shasum -a 256 -c SHA256SUMS)

printf '%s\n' '==> forbidden web dependencies'
if grep -Eiq '(react|typescript|(^|[^[:alnum:]])d3([^[:alnum:]]|$)|npm)' \
  Cargo.toml apps/web/Cargo.toml apps/web/index.html; then
  printf 'A forbidden JavaScript application dependency was found.\n' >&2
  exit 1
fi

printf '%s\n' '==> root static release'
"${ROOT_DIR}/scripts/build-web.sh" /

printf '%s\n' 'All checks passed.'
