# Model and Learning Profiles

## Identity boundaries

Transformer Viz keeps runtime model identity separate from learning-track identity.

| Concept | Current value | Owner |
|---|---|---|
| Model ID | `nanogpt-edu` | model manifest and Rust Worker |
| Architecture ID | `nanogpt-decoder-v1` | model manifest and Rust metadata |
| Learning Track ID | `decoder-only-fundamentals` | TypeScript profile registry |

A model ID identifies weights and assets. An architecture ID identifies the runtime structure those
assets implement. A learning-track ID identifies educational routes, guide content, notation, and
renderers. This separation permits a future compatible checkpoint to reuse the same learning track.

## Runtime facts and learning content

Runtime facts come from Rust and model assets:

- model and architecture IDs,
- layer, head, embedding, context, and vocabulary dimensions,
- normalization kind and placement,
- position encoding,
- self-attention and cross-attention topology,
- feed-forward kind,
- generation and KV-cache capability,
- LM-head tying and bias,
- model bias and dropout.

`crates/nanogpt-schema/src/config.rs` is the canonical wire type. `ts-rs` generates the corresponding
TypeScript types in `apps/web/src/generated/schema`. `apps/worker/src/runtime_assets.rs` constructs
the metadata after manifest, config, tokenizer, weights, and checksums pass validation.

Learning content remains TypeScript-owned:

- learning goals and explanations,
- guide sections and glossary entries,
- trusted KaTeX formulas,
- namespaced educational node and route mappings,
- profile compatibility expectations,
- architecture renderer selection.

Long educational prose does not enter the Rust protocol or model manifest.

## Registry and adapter

`apps/web/src/tracks/registry.ts` maps architecture IDs to one registered learning-track
implementation. It rejects duplicate track IDs and duplicate architecture mappings.

Resolution has two outcomes:

- `supported`: returns a compatible `LearningTrackAdapter`;
- `unsupported`: returns a controlled reason plus loaded model and supported-track information.

The generic `ArchitectureExplorer` renders only through the resolved adapter. It does not switch on
decoder route kinds, model IDs, Transformer family, Pre-LN, or causal attention.

The adapter owns:

- initial and available routes,
- breadcrumbs,
- guide-page resolution,
- model compatibility,
- Root, Block, and Self-Attention renderer assembly.

Worker lifecycle, generation, replay, prompt controls, decoded continuation, status, errors, and
responsive shell remain generic.

## Decoder-only Fundamentals profile

Current implementation lives under:

```text
apps/web/src/tracks/decoder-only-fundamentals/
├── adapter.tsx
├── guide.ts
├── index.ts
├── nodes.ts
├── notation.ts
├── profile.ts
└── routes.ts
```

The profile registers `nanogpt-decoder-v1` and `nanogpt-edu`. Existing Root, Transformer Block, and
Self-Attention renderers remain intact and are assembled only by this adapter.

Profile architecture expectations match runtime facts:

- decoder-only,
- LayerNorm with Pre-Norm placement,
- learned absolute position embeddings,
- causal multi-head self-attention,
- no cross-attention,
- GELU MLP,
- autoregressive generation,
- no KV cache,
- tied token-embedding LM head without output bias,
- zero dropout.

## Guide schema

`apps/web/src/tracks/types.ts` defines profile-owned guide pages with:

- learning goal and introduction,
- sections linked to namespaced node IDs,
- paragraph, bullet, step, formula, callout, comparison, example, and glossary-term blocks,
- key takeaway and optional next route.

`LearningGuide` is the generic renderer. Profile validation checks:

- unique page IDs,
- unique section IDs within each page,
- route-to-guide coverage,
- associated node mappings,
- formula IDs,
- glossary term IDs.

Runtime-specific facts such as selected layer, selected head, and trace-derived tensor shapes stay
in the decoder adapter's current annotation surfaces. They are not promoted into a universal graph
or trace schema.

## Namespacing

Learning routes are profile-specific:

```text
decoder.root
decoder.block
decoder.self-attention
```

Learning node IDs are namespaced:

```text
decoder.root.token-embedding
decoder.block.self-attention
decoder.attention.causal-mask
```

The decoder profile maps these IDs to current renderer IDs. Existing SVG selectors, formula IDs,
shape lookup, traces, and browser contracts therefore remain stable. A future profile can define
its own route and node namespace without changing the generic shell.

## Compatibility validation

Profile resolution compares loaded runtime metadata with profile expectations. It checks
architecture ID, family, normalization, norm placement, position encoding, attention topology,
feed-forward kind, generation, KV cache, LM-head facts, and dropout.

Any mismatch produces the unsupported-profile surface. The app never renders a decoder-only diagram
for an unknown or incompatible architecture.

## Adding another learning track

1. Extend Rust metadata variants only when the new runtime needs a fact not currently representable.
2. Build and validate the new model and generated TypeScript metadata.
3. Add a new profile directory with routes, namespaced nodes, guide content, notation, and adapter.
4. Declare compatible architecture and model IDs.
5. Register one `LearningTrackRegistration` in `tracks/registry.ts`.
6. Add compatibility, guide-integrity, navigation, browser, and numerical-parity tests.

Do not add model-specific conditionals to the generic shell. Do not combine decoder-only and
encoder-decoder diagrams into one conditional universal graph.

## Current non-features

The profile boundary does not implement an Encoder-Decoder model, Cross-Attention, second model
selector, sequence-to-sequence protocol, guided playback, tensor heatmaps, or the planned 48/52
Diagram and Learning Guide layout.
