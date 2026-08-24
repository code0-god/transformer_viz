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

Learning content and its presentation adapters remain TypeScript-owned:

- learning goals, explanations, misconceptions, and glossary entries,
- Guide pages, sections, stable content IDs, and trusted KaTeX formulas,
- namespaced educational node and route mappings,
- profile compatibility expectations and architecture renderer selection,
- runtime-fact and selected-operation adapter names and resolvers.

The current decoder adapters combine validated `ModelMetadata.config`, architecture selection, and
the retained selected generated-step replay into display-ready facts. Trace-dependent `T` and
shapes remain pending without matching replay evidence; Guide controls do not request Worker work.
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

Current implementation lives under `apps/web/src/tracks/decoder-only-fundamentals/`. Its profile,
routes, Guide page modules, glossary and misconception modules, node/notation maps, runtime
resolvers, route controls, and `DecoderLearningWorkspace` composition remain together there.

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

## Shipped Learning Workspace and Guide schema

Root, Transformer Block, and Self-Attention now render through one Learning Workspace. At desktop
widths it gives Diagram and Guide an approximately 48:52 split with a sticky Diagram; below 1280px
it stacks Diagram then Guide. Diagram activation changes true architecture selection or drill-down
and reveals related Guide content. Guide **도식에서 보기** controls only focus, highlight, and
reveal the Diagram; they do not change route, selection, layer/head state, or Worker traffic.

The Guide contracts define:

- learning goal, introduction, ordered sections, key takeaway, glossary, and optional next route;
- stable block/item/step/column IDs and compact outline section IDs;
- namespaced primary and associated learning nodes;
- paragraph, rich-inline, bullet, step, formula, callout, comparison, example, glossary-term,
  runtime-facts, and selected-operation blocks;
- text, strong, trusted formula, glossary-reference, and code inline content.

`LearningGuide` and its block renderers are model-copy-free. The decoder profile supplies Korean
Root/Block/Attention content, formulas, glossary, runtime adapters, and selected-operation adapters.
Runtime facts show validated model dimensions and architecture selection; Attention `T` and current
shape strings derive from the retained selected generated-step replay. Selected-operation evidence
is filtered to the current route and appears only in an associated section. These are symbolic and
derived shape strings, not actual tensor values.

Profile validation returns structured `{code,path,relatedId?}` issues; registry construction rejects
any issues before render. Shared checks cover route/page consistency, goals/takeaways/glossary,
stable IDs, formula/glossary/adapter references, and content order. Current mapping, primary-node,
interactive coverage, and drill-down exemption checks remain decoder-specific because
`validationMappings.ts` recognizes `decoder.root`, `decoder.block`, and `decoder.attention`
prefixes and the current architecture catalog.

Validated production screenshots are linked from the [README](../README.md) and the
[Learning Workspace boundary decision](design-decisions/model-learning-profiles.md).

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
shape lookup, traces, and browser contracts therefore remain stable. The renderer, workspace,
focus, and ref-registry behavior contain no decoder teaching copy, but the current
`LearningTrackId`/`LearningRouteId`/`LearningNodeId` unions and prefix-based mapping validator are
not fully generic. A future profile requires those seams to be generalized or parameterized before
its own route and node namespace can be registered.

## Compatibility validation

Profile resolution compares loaded runtime metadata with profile expectations. It checks
architecture ID, family, normalization, norm placement, position encoding, attention topology,
feed-forward kind, generation, KV cache, LM-head facts, and dropout.

Any mismatch produces the unsupported-profile surface. The app never renders a decoder-only diagram
for an unknown or incompatible architecture.

## Adding another learning track

1. Generalize or parameterize the closed track/route/node identifier unions and decoder-prefix
   mapping/coverage validation.
2. Extend Rust metadata variants only when the new runtime needs a fact not currently representable.
3. Build and validate the new model and generated TypeScript metadata.
4. Add a new profile directory with routes, namespaced nodes, Guide content, notation, runtime and
   selected-operation adapters, and renderer composition.
5. Declare compatible architecture and model IDs, then register one
   `LearningTrackRegistration` in `tracks/registry.ts`.
6. Add compatibility, Guide-integrity, navigation, browser, Worker/trace, and numerical-parity
   tests appropriate to the new runtime.

Do not add model-specific teaching copy to the reusable renderer/workspace components. Do not
combine decoder-only and encoder-decoder diagrams into one conditional universal graph.

## Current non-features

The shipped Learning Workspace does not implement actual Tensor/Q/K/V values, matrices, attention
heatmaps, a source inspector, or KV-cache visualization. It also does not implement an
Encoder-Decoder model, Cross-Attention, a second profile/model or model selector, a
sequence-to-sequence protocol, Track B, guided playback, or an automatic tour. Those additions need
separate contracts plus runtime, Worker, Rust, and verification work; derived shape strings are not
tensor evidence.
