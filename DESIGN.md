# Transformer Viz Interactive Learning Lab Design System

## 0. Research Log

- Embedded references: Claude, IBM Carbon, and Observable-style data tools were shortlisted; the warm editorial Claude direction was selected for dense model evidence without a generic monitoring-console appearance.
- Lazyweb: Observe, Coralogix, and Impact screens were reviewed. The useful grammar was a compact status layer, one dominant analysis surface, and narrow supporting rails; the blank Impact capture was rejected.
- StyleGallery: `scroll-body-shell`, `panel-layout`, `main-with-rail`, and `reel` define the bounded desktop shell, dominant stage, supporting Inspector, and horizontal Stage Rail. The Inspector owns desktop vertical scroll; the document owns mobile vertical scroll.
- Interaction references: beui StatefulButton and Tabs source informed Generate/Stop label swaps, loading semantics, mode indication, explicit press feedback, and reduced-motion fallbacks. CSS implements the mechanism without importing its React/Motion stack.
- Imagen drafts: unavailable in this tool environment. The real trace visualization remains the focal artifact rather than a decorative substitute.

## 1. Identity and Information Architecture

Transformer Viz is a warm scientific notebook with oscilloscope precision. It shows a tiny
Transformer writing forward in time, then lets a learner travel backward through the exact
computation that selected one token. Terracotta marks the selected computational path; muted gold
marks generation and context growth; real tensors and source correspondence provide proof.

The source and learning order is fixed:

1. Header
2. Generate controls
3. Decoded continuation and raw token timeline
4. Breadcrumb and current generation context
5. Architecture Map
6. Main Learning Canvas
7. Inspector
8. Guided progression

Generate is the entry experience. Architecture Map is orientation and free navigation. Main
Learning Canvas is the dominant explanation. Inspector is exact evidence. Guided progression is
the recommended route. Guided and Explore select the same architecture nodes and reuse the same
canvas and Inspector components.

## 2. Color

| Role | Token | Value | Use |
|---|---|---|---|
| Canvas | `--canvas` | `#f3f0e8` | Page ground |
| Surface | `--surface` | `#fbfaf6` | Main reading surfaces |
| Surface strong | `--surface-strong` | `#e9e4d8` | Selected and nested evidence |
| Ink | `--ink` | `#22221f` | Primary text and prediction structure |
| Ink muted | `--ink-muted` | `#68665f` | Secondary text |
| Hairline | `--hairline` | `#d7d1c4` | Structural separation |
| Accent | `--accent` | `#a94327` | Active path and controls |
| Accent soft | `--accent-soft` | `#f0d3c8` | Selected background |
| Positive | `--positive` | `#27614f` | Ready and completed states |
| Warning | `--warning` | `#8a5a12` | Loading and running states |
| Error | `--error` | `#a12d2d` | Recoverable errors |
| Focus | `--focus` | `#1769aa` | Keyboard focus |
| Query | `--query` | `#1769aa` | Q circle and query vectors |
| Key | `--key` | `#27614f` | K square and key vectors |
| Value | `--value` | `#6d4c8d` | V asymmetric marker and value vectors |
| Score | `--score-path` | `#a94327` | QK products and scaled scores |
| Mask | `--mask-ink` | `#6f6d66` | Hatch and mask text |
| Probability low/high | `--probability-low`, `--probability-high` | `#f3dfd6`, `#8f2f20` | Sequential probability ramp |
| Residual | `--residual` | `#a66616` | Residual additions |
| MLP | `--mlp` | `#147369` | MLP expansion and projection |
| Prediction | `--prediction-ink`, `--prediction-gold` | `#25231f`, `#a77a1f` | Tied head and ranked output |
| Generation | `--generation` | `var(--prediction-gold)` | Generated tokens, sampling, append/repeat |
| Generated soft | `--generation-soft` | `#efe0b7` | Generated-token timeline background |

Q, K, V, selected, completed, future, and masked states never depend on color alone. Mask uses hatch plus the word `mask`; Q/K/V use letters and distinct shapes.

## 3. Typography and Spacing

- UI: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`.
- Numeric: `ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`.
- H1 `1.25rem/1.25`, stage H2 `1.75rem/1.25`, H3 `1rem/1.35`, body `.9375rem/1.6`, supporting text `.75-.8125rem`.
- Base spacing unit is 4px: `--s1`, `--s2`, `--s3`, `--s4`, `--s5`, `--s6`, `--s8`, `--s10` map to 4-40px.
- Korean instructional prose uses natural wrapping; tensor IDs and source lines may scroll inline.

## 4. Layout and Scroll Ownership

### Desktop, 1200px and wider

- `.learning-lab` is a bounded `100dvb` scroll-body shell with no document scroll at 1440x900.
- Rows are Header, Generate, Timeline, Breadcrumb, Workspace, and Guided controls.
- Workspace areas are Architecture Map, dominant Main Canvas, and Inspector with intrinsic-safe
  tracks: `minmax(13rem,.7fr) minmax(32rem,1.9fr) minmax(19rem,.86fr)`.
- Timeline owns horizontal token overflow. Inspector owns vertical evidence scroll. Main Canvas
  stays visible while architecture and generation context change.

### Tablet, 768-1199px

- Architecture Map becomes a compact full-width disclosure row.
- Main Stage and Inspector form two columns; Inspector is 280-340px, targeting 300px.
- Generation timeline remains above the workspace. Expanded Architecture Map is bounded and
  scrollable.

### Mobile, 767px and narrower

- The document owns vertical scroll and follows source order: Generate, Timeline, Breadcrumb,
  Main Canvas, Architecture drawer, Inspector, Guided controls.
- No squeezed three-column layout is permitted. The page never exceeds the viewport width.
- Heatmaps own a bounded local two-axis scrollport so 44px selected cells stay visible. Stage Rail, token strip, tensor slices, source lines, math tables, and flow diagrams own only their required horizontal overflow.
- Heatmap cells remain at least 44x44px; `.matrix-scroll` scrolls rather than shrinking them.

Every grid/flex child that may scroll uses `min-block-size: 0` and `min-inline-size: 0`. Intrinsic grids use `minmax(min(..., 100%), 1fr)`.

## 5. Components

### Header and Explorer Modes

- Header pairs product identity with a polite lifecycle live region.
- Guided and Explore form an ARIA tablist with one tab stop. Guided changes nodes through the
  curriculum; Explore changes them through Architecture Map. Both preserve current generation step.

### Generate and Timeline

- Generate contains labelled prompt, Max new tokens, Temperature, Top-K, Sampling mode, Seed,
  Generate, and Stop controls.
- Generate/Stop is one stateful action surface with idle, running, stopped, complete, and error
  feedback. Press feedback uses short transform-only motion; reduced motion removes interpolation.
- Decoded text leads. Raw tokens remain available below it. Prompt and generated tokens differ by
  label, group boundary, marker, and surface treatment, never by color alone.
- Each generated token is a real button. Selection exposes generation step, context, selected next
  token, probability, layer, head, and query position.
- Context usage shows `used / block_size`; ContextLimit explains why generation stopped.

### Main Stage

The curriculum has four grouped parts and twenty-one ordered steps:

1. Input representation: Tokenization, Token Embedding, Position Embedding.
2. Transformer Block: LayerNorm, Q/K/V, Attention Score, Causal Mask, Softmax, Value
   Aggregation, Residual, MLP, Block Output.
3. Prediction: Final LayerNorm, LM Head, Logits.
4. Generation: Temperature, Top-K, Sampling, Generated Token, Append to Context, Repeat.

Each stage contains position, title, purpose, formula, one dominant real-trace visualization, exact evidence, and the bridge to the next concept. Stage heading uses `aria-live="polite"`. Every SVG visualization has `title` and `desc`, with equivalent HTML values nearby.

### Stage Rail

Previous, play/pause, Next, speed, and grouped part/step controls form one keyboard-reachable
progression. Only current part expands into individual steps; the interface never shows twenty-one
equal buttons in one row. Current step uses `aria-current="step"`. Autoplay is false at load and
stops at Repeat.

### Architecture Map

- GPT level shows Embedding, Block × `n_layer`, Final LayerNorm, tied LM Head, and Generation.
- Block level shows LN1, Attention, Residual, LN2, MLP, and Residual.
- Attention level shows Q/K/V, QKᵀ, Scale, Mask, Softmax, ×V, Merge Heads, and Projection.
- Generation level shows Logits, Temperature, Top-K, Softmax, Sample, Append, and Repeat.
- Every node is a button. Layer/head counts and dimensions come from `ModelMetadata.config`.
- Breadcrumb items are buttons and permit direct return to every ancestor.
- Generated-token loop arrow visibly reconnects Repeat to the full GPT forward path.

### Inspector

Explanation, Tensor, and Source use an ARIA tablist with one tab stop, wrapping Arrow keys, Home, and End. A current-stage detail disclosure exposes the existing 18 operation boundaries without becoming a second transport. Inspector actions preserve the narrative stage and do not request Worker data unless an actual layer/head/token/cell selection requires cached replay.

### Visualization Primitives

- Vector Strip: signed zero line, semantic color, selected feature, exact-value reel.
- Attention Matrix: raw/scaled/mask/probability modes, 44px roving-focus cells, bounded two-axis matrix scroll with selected-cell alignment, hatch/text mask cue.
- Tensor Flow: labelled shapes and paths plus an equivalent ordered HTML summary.
- Tensor Viewer: stable tensor ID, operation, shape, semantic axes, row-major flat index, selected value, bounded slice, and full score/value contribution tables.
- Source Correspondence: pinned nanoGPT lines, commit, MIT link, and Rust counterpart in a bounded source viewport.
- Sampling Distribution: one selected Generation operation owns the canvas at a time. Raw Logits,
  Temperature, Top-K, and Softmax stay outcome-neutral; only Sample marks the selected outcome.
  Sample marker geometry uses the stored selected interval, while candidate CDF columns are labelled
  as derived. Greedy shows neutral probabilities with no interval hatch or random marker. Append owns
  the before + token → after equation; Repeat owns after/next parity and full-prefix-forward evidence.
  Charts pair with an equivalent ordered HTML table. Compact Inspector facts remain operation-specific.
- Why This Token: context, candidate distribution, selected interval, and direct link into the
  Transformer architecture.

## 6. Interaction and Motion

`--micro` is `120ms ease-out`; `--standard` is `220ms ease-in-out`. Generate/Stop labels crossfade
inside a stable button. The active Guided/Explore indicator moves within its tablist. Newly streamed
tokens use one opacity/translate arrival marker; later tokens do not replay prior animations.
Motion only communicates state or relationship and uses transform, opacity, or filter. Focus stays
with the initiating control. Reduced motion makes every transition effectively zero while
preserving token streaming and state changes.

## 7. Accessibility Constraints

- Target WCAG 2.2 AA: body and secondary text at least 4.5:1; semantic graphics at least 3:1.
- Every visible button, textarea, and link has a minimum 44x44px target.
- Visible `:focus-visible` uses a 2px focus ring with offset.
- Skip link targets Main Stage. Lifecycle and stage changes are polite live regions; errors use alert semantics.
- Generation updates use one polite live region; each token is not announced as a separate alert.
- Stop remains keyboard reachable while generation is active. Mode tabs, breadcrumbs,
  architecture nodes, generated tokens, and grouped curriculum all have visible focus.
- Heatmaps implement grid semantics and roving keyboard focus. Inspector tabs implement tablist/tab/tabpanel semantics.
- CJK copy must not clip at 390, 1024, or 1440px widths.
- Generation visuals require an explicitly selected generated token. Sampling-only operations never
  invent tensor IDs; Logits names a replay tensor only while exact selected-step replay is bound.
- The sampling visual alone owns local vertical evidence scroll in the fixed desktop shell. Its SVG is
  named by title/description but is not a tab stop; exact adjacent values are keyboard reachable and
  decorative meters are hidden from assistive technology.
- Autoplay never starts automatically and all motion remains manually stoppable.

## 8. Accepted Debt

None accepted. Model arithmetic, weights, tokenizer, static deployment boundaries, and numerical
parity remain unchanged. Generation quality is intentionally limited by the small educational
model and is stated in the UI.
