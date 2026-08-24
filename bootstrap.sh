#!/bin/sh
set -eu

case "${1-}" in
  "") ;;
  -h | --help) printf 'Usage: %s\n' "$0"; exit 0 ;;
  *) printf 'Usage: %s\n' "$0" >&2; exit 2 ;;
esac

cd "$(dirname "$0")"
git submodule update --init --recursive reference/nanoGPT
docker compose up --build --detach --wait --wait-timeout 600

address="$(docker compose port web 5173)"
printf '\nTransformer Viz: http://127.0.0.1:%s/\n' "${address##*:}"
