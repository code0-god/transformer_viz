#!/usr/bin/env bash
set -euo pipefail

readonly ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly PUBLIC_URL="${1:-/}"
readonly DIST_DIR="${2:-${ROOT_DIR}/apps/web/dist}"
readonly MODEL_DIR="${ROOT_DIR}/assets/models/edu"
readonly PUBLIC_MODEL_DIR="${ROOT_DIR}/apps/web/public/models/edu"
readonly REFERENCE_DIR="${ROOT_DIR}/reference/nanoGPT"
readonly PUBLIC_REFERENCE_DIR="${ROOT_DIR}/apps/web/public/reference"
readonly BINDINGS_DIR="${ROOT_DIR}/apps/web/src/generated/schema"
readonly TEMP_BINDINGS="$(mktemp -d "${TMPDIR:-/tmp}/transformer-viz-bindings.XXXXXX")"
trap 'rm -rf "${TEMP_BINDINGS}"' EXIT

case "${PUBLIC_URL}" in
  / | /*/) ;;
  *)
    printf 'Public URL must begin and end with a slash: %s\n' "${PUBLIC_URL}" >&2
    exit 2
    ;;
esac

for command in node pnpm cargo wasm-bindgen python3; do
  command -v "${command}" >/dev/null 2>&1 || {
    printf 'Required command is missing: %s\n' "${command}" >&2
    exit 1
  }
done
[[ "$(node --version)" == "v$(tr -d '\n' < "${ROOT_DIR}/.node-version")" ]] || {
  printf '%s\n' 'Node must match .node-version exactly.' >&2
  exit 1
}
[[ "$(pnpm --version)" == "11.22.0" ]] || {
  printf '%s\n' 'pnpm must be exactly 11.22.0' >&2
  exit 1
}

cd "${ROOT_DIR}"
pnpm install --frozen-lockfile

printf '%s\n' '==> generated TypeScript binding freshness'
"${ROOT_DIR}/scripts/generate-typescript-bindings.sh" "${TEMP_BINDINGS}"
diff -ru "${BINDINGS_DIR}" "${TEMP_BINDINGS}"

if [[ "${TRANSFORMER_VIZ_PREBUILT_WORKER:-0}" == "1" ]]; then
  printf '%s\n' '==> prebuilt production Worker verification'
  "${ROOT_DIR}/scripts/ensure-worker-wasm.sh"
else
  printf '%s\n' '==> explicit production Worker build'
  "${ROOT_DIR}/scripts/build-worker-wasm.sh"
fi

printf '%s\n' '==> TypeScript lint, typecheck, and tests'
pnpm --dir apps/web lint
pnpm --dir apps/web typecheck
pnpm --dir apps/web test

printf '%s\n' '==> canonical model and reference assets'
for asset in config.json manifest.json model.safetensors SHA256SUMS source_map.json tokenizer.json; do
  cmp "${MODEL_DIR}/${asset}" "${PUBLIC_MODEL_DIR}/${asset}"
done
(cd "${MODEL_DIR}" && shasum -a 256 -c SHA256SUMS)
for asset in model.py LICENSE; do
  cmp "${REFERENCE_DIR}/${asset}" "${PUBLIC_REFERENCE_DIR}/${asset}"
done
(cd "${PUBLIC_REFERENCE_DIR}" && shasum -a 256 -c SHA256SUMS)

printf '%s\n' "==> Vite production build (${PUBLIC_URL})"
python3 "${ROOT_DIR}/scripts/worker_verified_snapshot.py" \
  "${ROOT_DIR}" "${ROOT_DIR}/apps/web/src/generated/worker" -- \
  pnpm --dir apps/web exec vite build \
    --base "${PUBLIC_URL}" \
    --outDir "${DIST_DIR}" \
    --emptyOutDir
python3 "${ROOT_DIR}/scripts/static-web-policy.py" \
  --root "${DIST_DIR}" \
  --base "${PUBLIC_URL}"

for asset in config.json manifest.json model.safetensors SHA256SUMS source_map.json tokenizer.json; do
  cmp "${MODEL_DIR}/${asset}" "${DIST_DIR}/models/edu/${asset}"
done
(cd "${DIST_DIR}/models/edu" && shasum -a 256 -c SHA256SUMS)
for asset in model.py LICENSE; do
  cmp "${REFERENCE_DIR}/${asset}" "${DIST_DIR}/reference/${asset}"
done
(cd "${DIST_DIR}/reference" && shasum -a 256 -c SHA256SUMS)

if find "${DIST_DIR}" -type f \( -name '*.py' -o -name '*.pyc' -o -name '*.sh' \) \
  ! -path "${DIST_DIR}/reference/model.py" -print -quit | grep -q .; then
  printf '%s\n' 'Static bundle contains an unexpected executable.' >&2
  exit 1
fi

PYTHONPATH="${ROOT_DIR}/scripts" python3 "${ROOT_DIR}/scripts/browser_release_ready.py" \
  --root "${DIST_DIR}" \
  --base "${PUBLIC_URL}"
printf 'Static bundle ready at %s for public URL %s\n' "${DIST_DIR}" "${PUBLIC_URL}"
