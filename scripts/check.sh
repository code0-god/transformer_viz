#!/usr/bin/env bash
set -euo pipefail

readonly ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly CHECK_DIST_DIR="$(mktemp -d "${TMPDIR:-/tmp}/transformer-viz-check.XXXXXX")"
readonly BINDINGS_CHECK="$(mktemp -d "${TMPDIR:-/tmp}/transformer-viz-schema.XXXXXX")"
trap 'rm -rf "${CHECK_DIST_DIR}" "${BINDINGS_CHECK}"' EXIT
cd "${ROOT_DIR}"

printf '%s\n' '==> pinned web toolchain and frozen dependencies'
[[ "$(node --version)" == "v$(tr -d '\n' < .node-version)" ]]
[[ "$(pnpm --version)" == "11.22.0" ]]
[[ "$(wasm-bindgen --version)" == "wasm-bindgen 0.2.127" ]]
pnpm install --frozen-lockfile
node_modules/.bin/wasm-opt --version | grep -Eq 'version 123([^0-9]|$)'

printf '%s\n' '==> generated TypeScript binding freshness'
"${ROOT_DIR}/scripts/generate-typescript-bindings.sh" "${BINDINGS_CHECK}"
diff -ru apps/web/src/generated/schema "${BINDINGS_CHECK}"

printf '%s\n' '==> TypeScript lint, typecheck, and tests'
pnpm --dir apps/web lint
pnpm --dir apps/web typecheck
pnpm --dir apps/web test

printf '%s\n' '==> rustfmt'
cargo fmt --all -- --check

printf '%s\n' '==> Clippy (native workspace)'
cargo clippy --workspace --all-targets --all-features -- -D warnings

printf '%s\n' '==> Clippy (WASM Worker)'
cargo clippy --target wasm32-unknown-unknown -p transformer-viz-worker --all-features -- -D warnings

printf '%s\n' '==> workspace tests'
cargo test --workspace

printf '%s\n' '==> root workspace release build'
cargo build --workspace --release

printf '%s\n' '==> WASM Worker (wasm32-unknown-unknown)'
cargo check --target wasm32-unknown-unknown -p transformer-viz-worker

printf '%s\n' '==> canonical assets'
for asset in config.json manifest.json model.safetensors SHA256SUMS source_map.json tokenizer.json; do
  cmp "assets/models/edu/${asset}" "apps/web/public/models/edu/${asset}"
done
(cd assets/models/edu && shasum -a 256 -c SHA256SUMS)
cmp reference/nanoGPT/model.py apps/web/public/reference/model.py
cmp reference/nanoGPT/LICENSE apps/web/public/reference/LICENSE
cmp reference/nanoGPT/LICENSE assets/reference/nanoGPT-LICENSE.txt
test "$(git -C reference/nanoGPT rev-parse HEAD)" = "$(tr -d '\n' < reference/NANOGPT_COMMIT)"
git -C reference/nanoGPT diff --quiet -- model.py
git -C reference/nanoGPT diff --cached --quiet -- model.py
python3 - <<'PY'
import hashlib, json, pathlib
root = pathlib.Path('.')
model = root / 'assets/models/edu'
manifest_bytes = (model / 'manifest.json').read_bytes()
manifest = json.loads(manifest_bytes)
worker_source = (root / 'apps/worker/src/asset_policy.rs').read_text()
assert hashlib.sha256(manifest_bytes).hexdigest() in worker_source
for kind in ('config', 'tokenizer', 'weights'):
    asset = model / manifest[f'{kind}_file']
    assert manifest[f'{kind}_size_bytes'] == asset.stat().st_size
    assert manifest[f'{kind}_sha256'] == hashlib.sha256(asset.read_bytes()).hexdigest()
metadata = json.loads((root / 'assets/golden/edu/metadata.json').read_text())
source = root / 'reference/nanoGPT/model.py'
assert metadata['reference_model_sha256'] == hashlib.sha256(source.read_bytes()).hexdigest()
PY

printf '%s\n' '==> root static release'
"${ROOT_DIR}/scripts/build-web.sh" / "${CHECK_DIST_DIR}/root"
printf '%s\n' '==> subpath static release'
"${ROOT_DIR}/scripts/build-web.sh" /transformer_viz/ "${CHECK_DIST_DIR}/subpath"

printf '%s\n' '==> compiled Worker trust anchor'
python3 - "${CHECK_DIST_DIR}" <<'PY'
import hashlib, pathlib, sys
root = pathlib.Path('.')
dist = pathlib.Path(sys.argv[1])
digest = hashlib.sha256((root / 'assets/models/edu/manifest.json').read_bytes()).hexdigest().encode()
for deployment in ('root', 'subpath'):
    wasm = list((dist / deployment).rglob('worker_bg-*.wasm'))
    assert wasm, f'{deployment} build has no Worker WASM'
    assert any(digest in path.read_bytes() for path in wasm), f'{deployment} Worker omits manifest anchor'
PY

printf '%s\n' '==> canonical Chrome readiness and Worker integrity'
mkdir -p "${CHECK_DIST_DIR}/browser-root/transformer_viz"
cp -R "${CHECK_DIST_DIR}/root/." "${CHECK_DIST_DIR}/browser-root/"
cp -R "${CHECK_DIST_DIR}/subpath/." "${CHECK_DIST_DIR}/browser-root/transformer_viz/"
PYTHONPATH="${ROOT_DIR}/scripts" \
  python3 "${ROOT_DIR}/scripts/browser_worker_integrity.py" \
  --root "${CHECK_DIST_DIR}/browser-root"

printf '%s\n' '==> React Worker generation and Architecture integration'
for entry in index.html transformer_viz/index.html; do
  PYTHONPATH="${ROOT_DIR}/scripts" \
    python3 "${ROOT_DIR}/scripts/browser_react_integration.py" \
    --root "${CHECK_DIST_DIR}/browser-root" \
    --entry "${entry}"
done

printf '%s\n' '==> architecture-first browser contract'
PYTHONPATH="${ROOT_DIR}/scripts" \
  python3 "${ROOT_DIR}/scripts/browser_architecture_contract.py" \
  --root "${CHECK_DIST_DIR}/browser-root"

printf '%s\n' '==> architecture navigation browser contract'
PYTHONPATH="${ROOT_DIR}/scripts" \
  python3 "${ROOT_DIR}/scripts/browser_architecture_navigation.py" \
  --root "${CHECK_DIST_DIR}/browser-root"

printf '%s\n' '==> Self-Attention architecture browser contract'
PYTHONPATH="${ROOT_DIR}/scripts" \
  python3 "${ROOT_DIR}/scripts/browser_architecture_attention.py" \
  --root "${CHECK_DIST_DIR}/browser-root"

printf '%s\n' '==> Learning Workspace browser contract'
for entry in index.html transformer_viz/index.html; do
  entry_label="${entry//\//-}"
  PYTHONPATH="${ROOT_DIR}/scripts" \
    python3 "${ROOT_DIR}/scripts/browser_learning_workspace.py" \
    --root "${CHECK_DIST_DIR}/browser-root" \
    --entry "${entry}" \
    --scenario all \
    --evidence "${CHECK_DIST_DIR}/learning-${entry_label}"
done

printf '%s\n' '==> Architecture notation browser contract'
PYTHONPATH="${ROOT_DIR}/scripts" \
  python3 "${ROOT_DIR}/scripts/browser_architecture_notation.py" \
  --root "${CHECK_DIST_DIR}/browser-root"

printf '%s\n' '==> generation transport rollback'
PYTHONPATH="${ROOT_DIR}/scripts" \
  python3 "${ROOT_DIR}/scripts/browser_generation_transport.py" \
  --root "${CHECK_DIST_DIR}/browser-root"

printf '%s\n' '==> generation bytes, Stop, and replay'
PYTHONPATH="${ROOT_DIR}/scripts" \
  python3 "${ROOT_DIR}/scripts/browser_react_generation.py" \
  --root "${CHECK_DIST_DIR}/browser-root"

printf '%s\n' 'All checks passed.'
