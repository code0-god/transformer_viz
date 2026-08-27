# ADR 0010: SVG architecture with lazy R3F data visualization

- Status: Accepted
- Date: 2026-08-27

## Context

Transformer Viz explains two different kinds of information:

1. where Transformer operations happen and how they connect;
2. how numerical tensors change inside one operation.

Semantic SVG, DOM, KaTeX, and HTML already describe the first category with
deterministic geometry, Korean text, exact connectors, browser accessibility,
and stable screenshots. WebGL can add value to the second category when a small
matrix benefits from height, viewpoint, and direct selection.

ThreeUI commit `326580429881c2abe7893bee53c62cbb31b6ee49` was audited as a
source reference. Its application shell, compact renderer controls, restrained
tabs, DPR clamp, resize observers, visibility-aware rendering, and explicit
resource disposal are useful patterns. Its package and visual identity are not.
`@designcodeio/threeui@1.1.0` carries `three128` and `three165` runtime aliases
in addition to a peer Three dependency.

The existing Worker can return a correlated `AttentionHeadTrace` after a
selected generation step is replayed. No Rust or schema change is required.

## Raw Three.js versus React Three Fiber

| Criterion | Raw Three.js | React Three Fiber |
| --- | --- | --- |
| React state integration | Imperative synchronization effects | Declarative props and scene graph |
| Lifecycle complexity | Renderer, scene, camera, resize, pointer, frame ownership | Canvas owns renderer, resize, events, and render scheduling |
| Cleanup and dispose | Entirely manual | Automatic for managed objects; custom controls still explicit |
| Resize | Custom observer | Canvas-managed |
| Pointer events | Manual raycasting | Mesh event props |
| Testing | Controller fakes plus browser | Pure model tests, component seams, plus browser |
| Bundle cost | Three only | Three plus Fiber reconciler/runtime |
| Learning curve | Direct Three API | React and Three mental models |
| Current app compatibility | Works, but creates an imperative island | R3F 9 supports React 19 and strict TypeScript |
| Future tensor scenes | Repeats lifecycle per scene | Shared declarative foundation |
| Performance | Direct control | Same Three renderer with small framework overhead |

Raw Three.js is the smallest choice for one isolated scene. This product,
however, explicitly needs a reusable visualization registry tied to selected
layer, head, token, query, key, generation step, trace, and concept state. The
future tensor-scene requirement outweighs the extra Fiber runtime.

## Decision

Use:

- `three@0.185.1`
- `@react-three/fiber@9.7.0`

Do not add:

- `@designcodeio/threeui`
- `@react-three/drei`
- copied ThreeUI assets or source

Use Three's official `OrbitControls` addon directly. Wire control changes to
R3F `invalidate()` so the Canvas can use `frameloop="demand"`.

Keep all architecture, curriculum, labels, formulas, arrows, breadcrumbs, and
node interactions in SVG/DOM. This milestone adds exactly one WebGL renderer:
`score-matrix-3d`.

## Data boundary

The visualization never invents model values.

```text
selected generation step
  -> replay RunSummary.run_id
  -> selected layer and head
  -> WorkerClient.inspectAttentionHead
  -> correlated attention_head_trace
  -> validated ScoreMatrixViewModel
  -> HTML table and lazy R3F scene
```

The browser accepts a response only when request ID, run ID, layer, and head
match the current pending inspection. New generation, replay, layer, or head
selection invalidates stale evidence.

The PoC displays raw query-key products from `raw_scores` and labels them
`S = QKᵀ`. Rust narrows the selected global head before serialization, so the
tensor shape is validated as `[1, 1, T, T]` and its row-major `T × T` values
start at offset zero. `trace.head` retains global head provenance. Causal-mask
state remains a separate annotation because masking is a later operation.

## Rendering policy

- `Canvas frameloop="demand"`
- `dpr={[1, 2]}`
- no automatic animation
- bounded orbit, pan, and zoom
- no camera travel below the matrix
- no textures, remote assets, postprocessing, or WebGL text
- signed zero plane with symmetric magnitude normalization
- semantic negative/neutral/positive scale plus numeric legend
- selected cell shown with a non-color outline and exact value
- reduced motion keeps the scene static

## Failure and cleanup policy

`ThreeVisualizationSurface` owns a local lazy boundary, renderer error boundary,
loading status, WebGL capability check, context-loss state, and retry control.
Failure never reaches the global Worker/App boundary.

R3F disposes managed geometries and materials on unmount. Direct
`OrbitControls`, context listeners, and any custom resources require explicit,
idempotent cleanup. StrictMode double setup/cleanup is a required test case.

## Accessibility

Canvas is an optional visual enhancement. The same matrix is always available
as an HTML table with caption, query row headers, key column headers, exact
finite values, and causal-mask status. WebGL unavailable, lazy-load failure,
renderer failure, or context loss opens or preserves the table.

## Loading and bundle policy

The renderer registry uses a literal dynamic import. Three and Fiber imports
exist only below that lazy boundary.

- Course Home and Explanation mode must not request WebGL chunks.
- Initial HTML must not module-preload WebGL chunks.
- Root and `/transformer_viz/` builds must resolve async chunks from the same
  origin.
- Bundle comparison reports raw, gzip, and Brotli sizes before and after.
- `@react-three/drei` remains excluded unless a later scene proves a concrete
  helper requirement.

## Consequences

The first visualization costs more JavaScript than Raw Three.js but establishes
one typed, React-owned foundation for later tensor scenes. SVG architecture
remains deterministic and accessible. A user who never opens Visualization pays
no initial WebGL transfer or GPU cost.

Future visualization kinds may include Q/K/V features, causal mask, softmax,
value aggregation, and head comparison. They are not implemented in this
milestone.
