# ADR 0008: Model-aware learning profiles

- Status: Accepted and implemented
- Date: 2026-08-24

## Context

The React application originally treated the bundled nanoGPT model as the only possible learning
experience. The shell directly selected GPT Root, Pre-LN Transformer Block, and Causal
Self-Attention routes. Guide copy and notation were colocated with those renderers.

That structure was correct for one model but made a future Encoder-Decoder track require changes to
generic Worker lifecycle, generation controls, and application composition. It also could render a
decoder-only diagram for metadata that merely had compatible tensor dimensions.

Runtime model facts and educational prose have different owners. Rust and model assets know what
the loaded model implements. TypeScript knows how to teach it.

## Decision

Add generated runtime architecture metadata to `ModelMetadata`. Rust remains canonical for model
identity, architecture family, normalization, position encoding, attention topology, feed-forward
kind, generation, KV cache, LM-head facts, bias, and dropout.

Add a TypeScript learning-track registry. Resolve the loaded architecture to one compatible
profile, then render through its adapter. The current nanoGPT implementation becomes the
`decoder-only-fundamentals` profile for architecture `nanogpt-decoder-v1`.

Keep model IDs and learning-track IDs distinct. A track may support multiple compatible checkpoints.

Keep guide content, glossary, notation, route definitions, and namespaced educational node mappings
inside the profile. Use a generic guide-block schema and renderer for reusable educational content.

Do not create one universal graph with encoder, decoder, cross-attention, normalization, and
position-encoding conditionals. Each track owns its renderer assembly behind the common adapter
contract.

Reject unknown or incompatible metadata with a controlled unsupported-profile surface. Never fall
back to the nanoGPT diagram.

Preserve the current Root, Transformer Block, and Self-Attention visual hierarchy, interaction,
generation, sampling, Worker protocol meaning, traces, weights, tokenizer, and numerical results.

## Consequences

The generic shell owns Header, lifecycle status, Prompt, Generate, decoded continuation, Worker
startup, errors, responsive layout, and active adapter resolution. It contains no decoder route
switch or nanoGPT educational copy.

The decoder profile owns current architecture assembly, routes, breadcrumbs, guide content,
notation, and compatibility expectations. Existing renderer IDs remain adapter-internal compatibility
IDs while profile-facing route and node IDs are namespaced.

Adding a second track requires a model/runtime implementation and one new profile registration, not
conditionals across the current shell. Encoder-Decoder, Cross-Attention, sequence-to-sequence traces,
and a model selector remain deliberately unimplemented.
