# ADR 0001: Static Rust/WASM application

- Status: Accepted
- Date: 2026-08-21

## Context

The visualization must run without a backend, expose real intermediate tensors, and remain
deployable from static hosting. Inference work must not freeze browser interaction.

## Decision

Build a Leptos client-rendered application with Trunk. Compile the application and a separate
inference Worker from Rust to WebAssembly. Keep model assets static and same-origin. Use a Cargo
workspace to enforce schema, tokenizer, model, trace, and web-package boundaries.

## Consequences

The deployment is portable static content and Python is limited to offline fixture generation.
Browser compatibility, WASM package size, Worker messaging, and base-relative asset paths become
explicit quality gates.
