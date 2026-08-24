#!/bin/sh
set -eu

root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
temporary="$(mktemp -d)"
trap 'rm -rf "$temporary"' EXIT HUP INT TERM

log="$temporary/calls.log"
mkdir "$temporary/bin"

cat >"$temporary/bin/git" <<'EOF'
#!/bin/sh
printf 'git %s\n' "$*" >>"$BOOTSTRAP_TEST_LOG"
EOF

cat >"$temporary/bin/docker" <<'EOF'
#!/bin/sh
printf 'docker %s\n' "$*" >>"$BOOTSTRAP_TEST_LOG"

case "$*" in
  "compose up "*)
    test "${BOOTSTRAP_TEST_FAIL_UP-0}" != 1
    ;;
  "compose port web 5173")
    printf '0.0.0.0:5173\n'
    ;;
  *)
    printf 'unexpected docker command: %s\n' "$*" >&2
    exit 64
    ;;
esac
EOF

chmod +x "$temporary/bin/git" "$temporary/bin/docker"

actual="$(
  BOOTSTRAP_TEST_LOG="$log" \
    PATH="$temporary/bin:$PATH" \
    "$root/bootstrap.sh"
)"

expected_calls="git submodule update --init --recursive reference/nanoGPT
docker compose up --build --detach --wait --wait-timeout 600
docker compose port web 5173"

if test "$(cat "$log")" != "$expected_calls"; then
  printf 'bootstrap command contract mismatch\nexpected:\n%s\nactual:\n%s\n' \
    "$expected_calls" "$(cat "$log")" >&2
  exit 1
fi

case "$actual" in
  *"Transformer Viz: http://127.0.0.1:5173/"*) ;;
  *)
    printf 'bootstrap did not print the ready URL after success\n' >&2
    exit 1
    ;;
esac

: >"$log"
if failure_output="$(
  BOOTSTRAP_TEST_FAIL_UP=1 \
    BOOTSTRAP_TEST_LOG="$log" \
    PATH="$temporary/bin:$PATH" \
    "$root/bootstrap.sh" 2>&1
)"; then
  printf 'bootstrap returned success when Compose startup failed\n' >&2
  exit 1
fi

case "$failure_output" in
  *"Transformer Viz:"*)
    printf 'bootstrap printed a ready URL when Compose startup failed\n' >&2
    exit 1
    ;;
esac

compose_config="$(docker compose -f "$root/compose.yaml" config --format json)"
case "$compose_config" in
  *'"healthcheck":'*'127.0.0.1:5173/'*) ;;
  *)
    printf 'Compose web service has no localhost HTTP healthcheck\n' >&2
    exit 1
    ;;
esac

printf 'bootstrap contract: PASS\n'
