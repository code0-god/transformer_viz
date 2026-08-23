# ADR 0004: Reproducible static deployment

- Status: Accepted
- Date: 2026-08-22
- Updated: 2026-08-23

## Context

The same backend-free application must deploy at an origin root or GitHub Pages project path
without external runtime assets or environment-dependent tool resolution.

## Decision

Pin Rust 1.94.0, wasm-bindgen CLI 0.2.127, Node 22.22.0, pnpm 11.22.0, and Binaryen 123.0.0 in
bootstrap, package metadata, lockfiles, and CI. Build React through Vite using
`scripts/build-web.sh <slash-delimited-base> <dist>`. Vite emits hashed application, Worker, WASM,
CSS, and KaTeX font assets. Public model/reference files are copied byte-for-byte and verified
against canonical checksums.

Production HTML contains one external module script and no inline script. The release validator
injects and verifies:

```text
Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; form-action 'none'
Referrer-Policy: strict-origin-when-cross-origin
```

`'wasm-unsafe-eval'` permits same-origin WebAssembly compilation. `worker-src`, `connect-src`,
`style-src`, and `font-src` remain same-origin. No inline hash or `'unsafe-inline'` allowance is
needed.

`scripts/check.sh` builds both `/` and `/transformer_viz/`, validates CSP/assets, then drives real
Chrome through Worker readiness, Worker loader failure, bounded/redirect rejection, generation,
architecture, KaTeX, and responsive contracts. GitHub Actions are SHA-pinned and Pages publishes
only `apps/web/dist`.

## Consequences

Root and project-subpath releases use one source path and differ only in emitted URL prefixes.
Tool upgrades require deliberate pin and lockfile changes. Static hosts must preserve the configured
base and serve WebAssembly with a compatible MIME type.

Only the root entry or configured deployment-prefix entry is supported. Arbitrary nested deep links
require host rewrites and are not provided by the GitHub Pages deployment.
