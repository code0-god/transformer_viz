# React Root Architecture feasibility spike

Isolated renderer proof for ADR 0006. This is not the shipping application.

## Proven boundary

- Vite + React + TypeScript render static Root Architecture.
- `src/model-config.ts` imports the canonical `assets/models/edu/config.json`.
- `Transformer Block × N` uses `GptConfig.n_layer`.
- `src/generated/GptConfig.ts` is synchronized from Rust with `ts-rs`.
- Rust model, Worker, generation, sampling, and trace code are untouched.

## Verify

```bash
npx --yes pnpm@11.22.0 --dir spikes/react-root-architecture install
npx --yes pnpm@11.22.0 --dir spikes/react-root-architecture check
bun test spikes/react-root-architecture/src/architecture.test.ts
cargo test -p nanogpt-schema --features typescript-bindings \
  gpt_config_typescript_binding_stays_generated
npx --yes pnpm@11.22.0 --dir spikes/react-root-architecture build
```

Production preview:

```bash
npx --yes pnpm@11.22.0 --dir spikes/react-root-architecture \
  exec vite preview --host 127.0.0.1 --port 4173
```
