# ADR 0004: Reproducible static deployment

- Status: Accepted
- Date: 2026-08-22

## Context

The same application must deploy at an origin root or a GitHub Pages project path without a
backend, external runtime assets, or environment-specific tool resolution.

## Decision

Pin Rust 1.94.0 and Trunk 0.21.14 in bootstrap and CI. Build through `scripts/build-web.sh` with a
slash-delimited public URL. Let Trunk write the HTML base and resolve app, Worker, and model URLs
relative to it. Validate that `dist` contains the complete static bundle and no Python or shell
runtime. Pin GitHub Actions by commit SHA and publish only `apps/web/dist`.

Run native workspace Clippy/tests and a separate WASM package check. This split is explicit because
native-only dependency targets cannot be compiled in the same Cargo invocation as the browser
target.

## Consequences

Root and `/transformer_viz/` releases use one code path and differ only in generated URL prefixes.
Tool upgrades and Actions revisions require deliberate pin changes. Static hosts must preserve the
project subpath and serve WASM with a compatible MIME type.
