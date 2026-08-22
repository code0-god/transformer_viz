#!/usr/bin/env bash
set -euo pipefail

readonly ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly PUBLIC_URL="${1:-/}"
readonly DIST_DIR="${2:-${ROOT_DIR}/apps/web/dist}"

case "${PUBLIC_URL}" in
  / | /*/) ;;
  *)
    printf 'Public URL must begin and end with a slash: %s\n' "${PUBLIC_URL}" >&2
    exit 2
    ;;
esac

cd "${ROOT_DIR}/apps/web"
env NO_COLOR=true trunk build --release --public-url "${PUBLIC_URL}" --dist "${DIST_DIR}"

grep -Fq "<base href=\"${PUBLIC_URL}\"" "${DIST_DIR}/index.html"
for pattern in '*.css' '*.js' '*.wasm' '*.safetensors'; do
  if ! find "${DIST_DIR}" -type f -name "${pattern}" -print -quit | grep -q .; then
    printf 'Static bundle is missing %s\n' "${pattern}" >&2
    exit 1
  fi
done

for asset in config.json manifest.json model.safetensors SHA256SUMS source_map.json tokenizer.json; do
  test -f "${DIST_DIR}/models/edu/${asset}"
done

if find "${DIST_DIR}" -type f \( -name '*.py' -o -name '*.pyc' -o -name '*.sh' \) -print -quit | grep -q .; then
  printf 'Static bundle contains a build-time or server-side executable.\n' >&2
  exit 1
fi
if grep -Eiq '(src|href)="(https?:)?//' "${DIST_DIR}/index.html"; then
  printf 'Static entry point contains a cross-origin runtime asset.\n' >&2
  exit 1
fi

printf 'Static bundle ready at %s for public URL %s\n' "${DIST_DIR}" "${PUBLIC_URL}"
