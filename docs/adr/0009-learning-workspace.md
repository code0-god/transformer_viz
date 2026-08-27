# ADR 0009: Model learning profiles and Learning Workspace boundaries

- Status: Accepted and implemented
- Date: 2026-08-24
- Scope: Current shipped Learning Workspace

## Context

Transformer Viz has one validated runtime architecture and one registered learning profile, but it
must not make a generic React shell synonymous with nanoGPT. The shipped experience also needs two
related forms of state:

1. architecture state that determines the real route, layer, head, and selected operation; and
2. learning focus that reveals the corresponding Guide section or highlights a Diagram node.

Conflating them would let explanatory controls alter the architecture being explained. Moving Guide
content or runtime interpretation into the generic shell would instead make a future profile depend
on decoder-only assumptions. Asking the Worker for Guide interactions would couple reading and
focus behavior to model execution.

This decision refines [ADR 0008](../adr/0008-model-aware-learning-profiles.md) for the shipped Root,
Transformer Block, and Self-Attention Learning Workspace. It does not change Rust, the Worker
protocol, generation, replay, trace retention, model assets, or numerical semantics.

## Decision

### Ownership matrix

| Boundary | Owns | Current limitation / does not own | Source contract |
|---|---|---|---|
| Reusable content and presentation shapes | Structurally reusable Guide block/inline variants plus display-ready runtime-fact and selected-operation shapes | Guide route/node fields still depend on the current identifier unions; these contracts are not fully model-neutral | [`guideTypes.ts`](../../apps/web/src/tracks/guideTypes.ts), [`workspaceTypes.ts`](../../apps/web/src/tracks/workspaceTypes.ts), [`types.ts`](../../apps/web/src/tracks/types.ts) |
| Current identifier contracts | Decoder and canonical track forms, decoder route/node namespaces, and a `canonical.*` test/representability lane | `LearningTrackId`, `LearningRouteId`, and `LearningNodeId` are closed around current decoder/canonical forms and must be generalized or parameterized for another real profile | [`workspaceTypes.ts`](../../apps/web/src/tracks/workspaceTypes.ts) |
| Shared validation core | Structured `{code,path,relatedId?}` issues, content/reference/order checks, route/page checks, and registry-construction rejection | Its validation inputs use the current identifier contracts; it does not by itself make arbitrary profile routes pluggable | [`validation.ts`](../../apps/web/src/tracks/validation.ts), [`validationContent.ts`](../../apps/web/src/tracks/validationContent.ts), [`validationTypes.ts`](../../apps/web/src/tracks/validationTypes.ts), [`registry.ts`](../../apps/web/src/tracks/registry.ts) |
| Decoder-specific mapping validation | Decoder prefix-to-route resolution and current architecture-catalog capability checks for associations, primary nodes, interactive coverage, and drill-down exemptions | Another profile cannot reuse these mapping rules unchanged | [`validationMappings.ts`](../../apps/web/src/tracks/validationMappings.ts), [`catalog.ts`](../../apps/web/src/architecture/catalog.ts) |
| Reusable Guide rendering | Learning goal, introduction, ordered sections, outline, rich blocks, formulas, runtime facts, selected-operation presentation, takeaway, glossary, and next step | Model calculations, decoder prose, and runtime adapter resolution; typed route/node inputs still use the current ID contracts | [`LearningGuide.tsx`](../../apps/web/src/tracks/LearningGuide.tsx), [`GuideBlocks.tsx`](../../apps/web/src/tracks/GuideBlocks.tsx), [`GuideDynamicBlocks.tsx`](../../apps/web/src/tracks/GuideDynamicBlocks.tsx), [`GuideInline.tsx`](../../apps/web/src/tracks/GuideInline.tsx) |
| Reusable workspace/focus behavior | Model-copy-free route header, Diagram/Guide panes, focus transitions, typed target registration, reveal, nearest-edge scrolling, reduced-motion behavior, and focus status | Architecture selection, route transitions, layer/head selection, and Worker requests; another profile also needs generalized route/node ID types | [`LearningWorkspace.tsx`](../../apps/web/src/tracks/LearningWorkspace.tsx), [`learningFocus.ts`](../../apps/web/src/tracks/learningFocus.ts) |
| Decoder-only profile | Route pages, Korean content, glossary, misconceptions, namespaced learning-node mapping, notation catalog, runtime/operation adapter names and resolvers, route controls, and display-ready facts | Shared rendering behavior and shared validation envelope/content checks | [`profile.ts`](../../apps/web/src/tracks/decoder-only-fundamentals/profile.ts), [`guide.ts`](../../apps/web/src/tracks/decoder-only-fundamentals/guide.ts), [`nodes.ts`](../../apps/web/src/tracks/decoder-only-fundamentals/nodes.ts), [`guideRuntime.ts`](../../apps/web/src/tracks/decoder-only-fundamentals/guideRuntime.ts), [`DecoderRouteControls.tsx`](../../apps/web/src/tracks/decoder-only-fundamentals/DecoderRouteControls.tsx) |
| Existing architecture and application path | True route, selected node, layer and head; Diagram activation; generation and retained-step replay commands and state | Guide-only focus and highlight | [`state.ts`](../../apps/web/src/architecture/state.ts), [`DecoderLearningWorkspace.tsx`](../../apps/web/src/tracks/decoder-only-fundamentals/DecoderLearningWorkspace.tsx), [`AppContext.tsx`](../../apps/web/src/app/AppContext.tsx), [`appReducer.ts`](../../apps/web/src/app/appReducer.ts) |
| Worker and Rust runtime | Model loading, tokenization, inference, generation, retained-step reconstruction, and validated responses | Learning Guide content, focus, highlight, and reveal | [`WorkerRequest.ts`](../../apps/web/src/generated/schema/WorkerRequest.ts), [`WorkerClient.ts`](../../apps/web/src/worker/WorkerClient.ts), [`apps/worker`](../../apps/worker/) |

The renderer, block presentation, workspace, focus, and reference-registry behavior are reusable and
contain no decoder teaching copy. The structured issue envelope and content checks are also shared.
The current route/node types and mapping coverage logic remain decoder-specific integration seams.
The `decoder-only-fundamentals` profile owns every current educational choice and conversion from
decoder runtime state to display-ready Guide data.

### Selection and learning focus

The architecture reducer is the source of truth for `view`, `selectedLayer`, `selectedHead`, and
`selectedNodeId`. A Diagram activation dispatches an architecture action. Selectable nodes update
`selectedNodeId`; drill-down nodes change the architecture view. The same Diagram activation may
also reveal a related Guide section, but that reveal is secondary to the architecture action.

A Guide **도식에서 보기** control calls the learning-focus path only. It records the active Guide
section and independent highlighted learning-node IDs, then uses the typed route/node registry to
focus and reveal a mounted Diagram target. It does not dispatch an architecture action, navigate a
route, select a layer or head, or call a Worker client. Route changes reset learning focus and focus
the route heading; layer and head changes preserve the current Guide focus because they remain on
the same route. Missing or unmounted targets report `unavailable` instead of falling back to a
global selector.

This directionality is intentional:

- Diagram -> actual architecture selection or drill-down, plus related Guide reveal.
- Guide -> learning focus, Diagram highlight, and target reveal only.

### Runtime sources

Runtime presentations are display adapters over already-held state; they are not a second inference
path.

| Presented value | Source and derivation | Pending rule |
|---|---|---|
| Root blocks, heads, model width `C`, context window, vocabulary | Validated `ModelMetadata.config`: `n_layer`, `n_head`, `n_embd`, `block_size`, `vocab_size` | Never inferred from Guide copy; unavailable metadata prevents the supported workspace from rendering |
| Selected Block layer; Attention layer/head | Existing architecture state | Ready while the compatible profile is rendered |
| Attention `T` | `replaySummary.tokens.length` from the retained selected generated-step replay | Pending when `replaySummary` is absent |
| Head dimension `D` and scale `1 / sqrt(D)` | `C / H` and its derived scale from validated model shape inputs | Pending if shape construction rejects non-positive/non-integer `C` or `H`, or `C` is not divisible by `H` |
| Q/K/V and operation shapes | Symbolic notation plus `CurrentAttentionShapes`, using `T`, `C`, `H`, and `D` | Trace-dependent current shapes are pending when `T` is absent; no tensor values are synthesized |
| Selected operation | `selectedNodeId`, filtered by the current architecture route's operation allowlist, then rendered only in the Guide section whose primary/associated nodes contain that selected learning node | Omitted for null, cross-route/not-allowed, or unassociated selection; current shape remains pending without a valid retained replay shape |

Selecting a generated step clears the previous `replaySummary` before sending
`inspect_generation_step`. Only a `generation_step_trace` whose request ID, generation run ID, step
index, and stored step summary all match the pending replay is retained. A missing, stale, or
mismatched response is ignored, so `T` and trace-dependent shapes remain pending rather than reusing
stale evidence. See [`generationState.ts`](../../apps/web/src/app/generationState.ts),
[`appReducer.ts`](../../apps/web/src/app/appReducer.ts), [`App.tsx`](../../apps/web/src/App.tsx),
[`shapes.ts`](../../apps/web/src/domain/shapes.ts),
[`guideRuntimeFacts.ts`](../../apps/web/src/tracks/decoder-only-fundamentals/guideRuntimeFacts.ts),
and [`guideRuntimeOperations.ts`](../../apps/web/src/tracks/decoder-only-fundamentals/guideRuntimeOperations.ts).

Guide controls themselves send no Worker request. Worker traffic remains limited to the existing
initialization, full-forward run, generation/stop/continue, generated-step replay inspection,
block/head/token trace inspection, and cancellation protocol defined by the generated
[`WorkerRequest`](../../apps/web/src/generated/schema/WorkerRequest.ts).

### Structured validation

Every registration is validated once while the learning-track registry is constructed. Any issue
causes `LearningProfileValidationError` before an adapter or Guide can render. Issues have the stable
machine shape:

```ts
{ code, path, relatedId? }
```

Validation enforces:

- unique route IDs and a known initial route;
- one Guide page per route, unique/non-empty page IDs, route/page key consistency, and matching
  route `guidePageId`;
- non-empty learning goal, key takeaway, and page glossary;
- next-step presence for nonterminal routes, absence for terminal routes, and known next routes;
- unique/non-empty section IDs and valid outline targets;
- stable non-empty content IDs, including list items, steps, and comparison columns, with no
  duplicate content ID across the page scan;
- known glossary terms, formulas, runtime adapters, and selected-operation adapters;
- explanatory content before the first formula encountered by the page content scan;
- associated learning nodes that exist and belong to the page route;
- primary nodes that exist, are interactive, appear in their section's associated set, and are not
  reused as another section's primary node;
- coverage for every route-visible selectable or drill-down node, unless a declared exemption is a
  known, same-route, non-duplicated drill-down transition.

The shared validator checks IDs, references, ordering, and route/page consistency, not Korean
wording. Mapping, interactive coverage, primary-node, and exemption checks additionally use the
current decoder prefix rules and architecture catalog. A `canonical.*` fixture demonstrates that
the content schema can represent an unregistered future page; it does not prove that a second
profile can register without first generalizing those identifier and mapping seams.

### Content and rendering rules

A page is profile data, not route-specific JSX. The generic renderer presents the page in this
order: title and learning goal, optional compact outline, introduction, ordered textbook sections,
key takeaway, glossary, and optional next step. Blocks support paragraphs, rich inline text,
bullets, steps, formulas, callouts, comparisons, examples, glossary terms, runtime facts, and
selected-operation evidence. Rich inline content supports text, emphasis, trusted formula IDs,
glossary references, and code.

Formula definitions remain in the profile notation catalog and are rendered through the generic
trusted formula path. Runtime and operation adapters provide display-ready values; the generic
Guide does not calculate model facts. Selected-operation evidence appears only inside a section
associated with the actual route-visible selected node.

The current registered content is decoder-only and Korean. It teaches:

- Root: context, token/position embeddings, hidden state, repeated Blocks, logits, token selection,
  append-and-repeat generation, and the absence of KV-cache reuse;
- Transformer Block: Pre-LN LayerNorm, causal Self-Attention, two residual additions, and the MLP;
- Self-Attention: Q/K/V projection, heads, score, scale, causal mask, Softmax, Value aggregation,
  merge, and output projection.

No generic component contains GPT, Pre-LN, causal-attention, GELU, or nanoGPT teaching copy.

### Responsive composition and evidence

> **Superseded for Course Learn by ADR 0010.** The sticky/local-overflow decision below describes
> the standalone Learning Workspace at ADR 0009 acceptance. Course Learn now uses a bounded 48:52
> split, static Diagram, and active right-pane-only scroll ownership.

At viewport widths of at least 80rem (1280px), the workspace uses
`minmax(34rem, 48fr) minmax(38rem, 52fr)`: Diagram and Guide have near-equal weight, with the Guide
slightly wider. The Diagram pane is sticky and wide diagrams retain local horizontal scrolling.
Below 80rem, Diagram then Guide use document flow; the Guide does not gain an independent vertical
scrollbar. These rules are implemented in
[`learningWorkspace.css`](../../apps/web/src/tracks/learningWorkspace.css).

Final production captures:

| Route | Desktop | Mobile |
|---|---|---|
| Root | [1440x900](../screenshots/learning-root-desktop.png) | [390x844](../screenshots/learning-root-mobile.png) |
| Transformer Block | [1440x900](../screenshots/learning-block-desktop.png) | Not retained as one of the five release screenshots |
| Self-Attention | [1440x900](../screenshots/learning-attention-desktop.png) | [390x844](../screenshots/learning-attention-mobile.png) |

The production browser contract covers bidirectional focus behavior and zero Worker-post delta for
Guide actions in both root and project-subpath builds. The visual capture contract checks the
48:52 desktop split, 1024px and 390px stacking, sticky desktop Diagram, local overflow, image
identity, and browser health. The durable executable evidence is
[`browser_learning_workspace.py`](../../scripts/browser_learning_workspace.py) and
[`browser_learning_workspace_visual.py`](../../scripts/browser_learning_workspace_visual.py); the
five linked PNGs are the committed release views.

## Rejected alternatives

- **Use architecture selection for Guide focus.** Rejected because reading controls would silently
  change the operation, route, layer, or head being explained.
- **Resolve runtime facts in generic components.** Rejected because model dimensions and operation
  meanings belong to the compatible profile.
- **Request fresh Worker evidence from Guide controls.** Rejected because focus/reveal needs no
  inference and because it would change Worker and replay semantics.
- **Retain a full trace for every generated step.** Rejected; the existing compact-step and selected
  replay boundary remains unchanged.
- **Treat the current ID unions and prefix mapper as already generic.** Rejected because
  `workspaceTypes.ts` closes the current namespaces and `validationMappings.ts` explicitly maps
  decoder prefixes. A second profile requires those seams to be generalized or parameterized.
- **Add a universal conditional Transformer graph.** Rejected; after the shared seams are
  generalized, a future architecture must still supply its own profile, mappings, content, runtime
  adapters, and compatible runtime implementation.

## Consequences

The shipped Workspace makes Diagram and Guide peers while preserving one architecture truth source.
Guide interactions are deterministic UI work and can be tested independently of Worker execution.
Profile construction fails early on broken machine-consumed content links. The renderer and
workspace behavior remain reusable without embedding decoder teaching copy, but the current profile
contract and mapping validator are not a drop-in multi-profile extension point.

The cost is both shared-seam and profile work. Before registering another real profile, route/track/
node identifiers and mapping/coverage validation must be generalized or parameterized. The new
profile must then define complete routes, pages, glossary, notation, mappings, coverage decisions,
and runtime/operation adapters. It must also provide runtime metadata and Worker/trace behavior
appropriate to that architecture; the current contracts do not make an unsupported architecture
executable.

## Track B and future work

Track B remains unimplemented. ADR 0010 supersedes the blanket matrix absence with one bounded
exception: an actual-trace Attention Score Matrix PoC. General Tensor/Q/K/V values, attention
heatmaps, a source inspector, and a KV-cache visualization remain absent. Encoder-Decoder,
Cross-Attention, a second profile/model, and a model selector are also absent.

Adding any of those evidence surfaces requires separate content and rendering contracts, runtime
DTOs, retention/correlation rules, Worker requests and calculations, Rust implementation, and
production verification. This ADR does not pre-authorize that work and does not imply that the
current derived shape strings are tensor evidence.
