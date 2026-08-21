# Transformer Viz

Transformer Viz is a static Rust/WASM teaching application that exposes the intermediate tensors
of a small nanoGPT-compatible Transformer in the browser. Its app and dedicated Worker share a
versioned serde trace protocol and deterministic educational byte tokenizer.

## Bootstrap

Prerequisites are `rustup`, Cargo, and Git. The repository pins Rust **1.94.0**, the
`wasm32-unknown-unknown` target, and Trunk **0.21.14**.

```sh
./scripts/bootstrap.sh
cargo test --workspace
```

The web application and Worker live in `apps/web`. Schema, tokenizer, model, and trace
responsibilities live in four separate crates under `crates/`. See
[the architecture](docs/ARCHITECTURE.md) and the
[schema/tokenizer decision](docs/adr/0003-schema-and-tokenizer.md).

## Reference implementation

`reference/nanoGPT` is a read-only Git submodule pinned to an immutable upstream commit. It is a
reference for compatibility and golden fixtures, not a runtime dependency. Provenance and license
details are recorded in [reference/NANOGPT_SOURCE.md](reference/NANOGPT_SOURCE.md) and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

Transformer Viz is licensed under the MIT License. Third-party reference material retains its own
copyright and license.
