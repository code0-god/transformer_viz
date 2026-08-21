# Transformer Viz

Transformer Viz is a planned static Rust/WASM teaching application that will expose the
intermediate tensors of a small nanoGPT-compatible Transformer in the browser. Phase A only
establishes the reproducible workspace and source-reference baseline; inference and UI behavior
belong to later phases.

## Bootstrap

Prerequisites are `rustup`, Cargo, and Git. The repository pins Rust **1.94.0**, the
`wasm32-unknown-unknown` target, and Trunk **0.21.14**.

```sh
./scripts/bootstrap.sh
cargo test --workspace
```

The web application lives in `apps/web`. Schema, tokenizer, model, and trace responsibilities live
in four separate crates under `crates/`; the Worker binary belongs to the web package in a later
phase. See [the architecture](docs/ARCHITECTURE.md).

## Reference implementation

`reference/nanoGPT` is a read-only Git submodule pinned to an immutable upstream commit. It is a
reference for compatibility and golden fixtures, not a runtime dependency. Provenance and license
details are recorded in [reference/NANOGPT_SOURCE.md](reference/NANOGPT_SOURCE.md) and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

Transformer Viz is licensed under the MIT License. Third-party reference material retains its own
copyright and license.
