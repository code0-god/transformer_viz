#!/bin/sh
set -eu

case "${1-}" in
  "") ;;
  -h | --help) printf 'Usage: %s\n' "$0"; exit 0 ;;
  *) printf 'Usage: %s\n' "$0" >&2; exit 2 ;;
esac

cd "$(dirname "$0")"
exec docker compose down --remove-orphans
