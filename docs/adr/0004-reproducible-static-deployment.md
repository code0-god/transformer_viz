# ADR 0004: Reproducible static deployment

- Status: Accepted
- Date: 2026-08-22

## Context

The same application must deploy at an origin root or a GitHub Pages project path without a
backend, external runtime assets, or environment-specific tool resolution.

## Decision

Pin Rust 1.94.0 and Trunk 0.21.14 in bootstrap and CI. Build through `scripts/build-web.sh` with a
slash-delimited public URL. Let Trunk write the HTML base and resolve app, Worker, WASM, model, and
pinned source/license URLs relative to it. Validate that `dist` contains the complete static bundle,
the byte-identical `reference/model.py` and `reference/LICENSE` copies, their SHA-256 manifest, and
no Python or shell runtime. Pin GitHub Actions by commit SHA and publish only `apps/web/dist`.

The static entry point embeds this CSP and referrer policy:

```text
Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; form-action 'none'
Referrer-Policy: strict-origin-when-cross-origin
```

The release build adds a SHA-256 hash of Trunk's exact inline module bootstrap to the emitted
`script-src` directive. `'wasm-unsafe-eval'` permits same-origin WebAssembly compilation;
`worker-src 'self'` permits the module Worker; and `connect-src 'self'` permits its same-origin
model requests. A `<meta>` CSP covers static-only hosts such as GitHub Pages. Deployments that can
set response headers must send the emitted artifact's complete `Content-Security-Policy` value,
including its generated `script-src 'sha256-...'` token, and the same `Referrer-Policy`; set
`frame-ancestors 'self'` only as an HTTP header because browsers do not enforce it from a meta
element.

Run native workspace Clippy/tests and a separate WASM package check. This split is explicit because
native-only dependency targets cannot be compiled in the same Cargo invocation as the browser
target.

## Consequences

Root and `/transformer_viz/` releases use one code path and differ only in generated URL prefixes.
Tool upgrades and Actions revisions require deliberate pin changes. Static hosts must preserve the
project subpath and serve WASM with a compatible MIME type.

The static host serves only generated files: root (`/`) and the configured deployment-prefix entry
point (for example, `/transformer_viz/`) are supported. Arbitrary nested deep links (for example,
`/transformer_viz/lesson/attention`) are unsupported unless a host is explicitly configured to
rewrite them to that prefix's `index.html`; GitHub Pages has no such fallback in this deployment.
