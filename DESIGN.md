# Transformer Viz Guided Player Design System

## 0. Research Log

- Embedded references: Claude, IBM Carbon, and Observable-style data tools were shortlisted; the warm editorial Claude direction was selected for dense model evidence without a generic monitoring-console appearance.
- Lazyweb: Observe, Coralogix, and Impact screens were reviewed. The useful grammar was a compact status layer, one dominant analysis surface, and narrow supporting rails; the blank Impact capture was rejected.
- StyleGallery: `scroll-body-shell`, `panel-layout`, `main-with-rail`, and `reel` define the bounded desktop shell, dominant stage, supporting Inspector, and horizontal Stage Rail. The Inspector owns desktop vertical scroll; the document owns mobile vertical scroll.
- Interaction references: beui button, tab, and disclosure mechanisms informed explicit press, roving-tab, and Model Map disclosure states. Reduced motion preserves state changes without interpolation.
- Imagen drafts: unavailable in this tool environment. The real trace visualization remains the focal artifact rather than a decorative substitute.

## 1. Identity and Information Architecture

Transformer Viz is a warm scientific notebook with oscilloscope precision. It makes a tiny Transformer inspectable rather than magical. Terracotta marks the selected computational path across parchment surfaces; real tensor values and source correspondence provide proof.

The source and learning order is fixed:

1. Header
2. Prompt
3. Context Bar
4. Main Stage
5. Stage Rail
6. Inspector
7. Model Map

Main Stage is the primary learning surface. Inspector is supporting evidence. Model Map is orientation. Stage Rail is transport. CSS may reposition regions on larger viewports but must not alter source or focus order.

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

Q, K, V, selected, completed, future, and masked states never depend on color alone. Mask uses hatch plus the word `mask`; Q/K/V use letters and distinct shapes.

## 3. Typography and Spacing

- UI: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`.
- Numeric: `ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`.
- H1 `1.25rem/1.25`, stage H2 `1.75rem/1.25`, H3 `1rem/1.35`, body `.9375rem/1.6`, supporting text `.75-.8125rem`.
- Base spacing unit is 4px: `--s1`, `--s2`, `--s3`, `--s4`, `--s5`, `--s6`, `--s8`, `--s10` map to 4-40px.
- Korean instructional prose uses natural wrapping; tensor IDs and source lines may scroll inline.

## 4. Layout and Scroll Ownership

### Desktop, 1200px and wider

- `.guided-player` is a bounded `100dvb` scroll-body shell with no document scroll at 1440x900.
- Rows are Header, Prompt, Context, Workspace, and Stage Rail.
- Workspace areas are Model Map, dominant Main Stage, and Inspector with intrinsic-safe tracks: `minmax(12rem,.62fr) minmax(32rem,1.9fr) minmax(19rem,.86fr)`.
- Main Stage stays fully visible. Inspector alone owns vertical evidence scroll. Stage Rail closes the viewport.
- Model Map toggle is hidden and map content is always visible.

### Tablet, 768-1199px

- Model Map becomes a compact full-width disclosure row.
- Main Stage and Inspector form two columns; Inspector is 280-340px, targeting 300px.
- Token strip owns horizontal overflow. Expanded Model Map content is bounded and scrollable.

### Mobile, 767px and narrower

- The document owns vertical scroll and follows source order: Main Stage, Stage Rail, Inspector, Model Map.
- No squeezed three-column layout is permitted. The page never exceeds the viewport width.
- Heatmaps own a bounded local two-axis scrollport so 44px selected cells stay visible. Stage Rail, token strip, tensor slices, source lines, math tables, and flow diagrams own only their required horizontal overflow.
- Heatmap cells remain at least 44x44px; `.matrix-scroll` scrolls rather than shrinking them.

Every grid/flex child that may scroll uses `min-block-size: 0` and `min-inline-size: 0`. Intrinsic grids use `minmax(min(..., 100%), 1fr)`.

## 5. Components

### Header, Prompt, and Context

- Header pairs product identity with a polite lifecycle live region.
- Prompt is a labelled disclosure with textarea, run action, disabled/loading state, and visible recovery copy.
- Context is a horizontal token reel with selected query/key markers and current Layer/Head coordinates.

### Main Stage

The nine `NarrativeStage` variants and order are authoritative:

1. Embedding
2. Attention LayerNorm
3. Q/K/V
4. Attention Score
5. Causal Mask
6. Softmax
7. Value + Residual
8. MLP + Residual
9. Prediction

Each stage contains position, title, purpose, formula, one dominant real-trace visualization, exact evidence, and the bridge to the next concept. Stage heading uses `aria-live="polite"`. Every SVG visualization has `title` and `desc`, with equivalent HTML values nearby.

### Stage Rail

Previous, play/pause, Next, speed, and nine labelled stage buttons form one keyboard-reachable reel. Current stage uses `aria-current="step"`; completed and future states also differ by text/border. Autoplay is false at load, manually stoppable, advances on a deterministic 250ms clock, and stops at stage nine. Paused playback does not update full application state.

### Inspector

Explanation, Tensor, and Source use an ARIA tablist with one tab stop, wrapping Arrow keys, Home, and End. A current-stage detail disclosure exposes the existing 18 operation boundaries without becoming a second transport. Inspector actions preserve the narrative stage and do not request Worker data unless an actual layer/head/token/cell selection requires cached replay.

### Model Map

Configuration values come from `ModelMetadata.config`; layers and heads are never hard-coded. Below 1200px, `.model-map-toggle` controls `.model-map-body` with `aria-expanded` and `aria-controls`, collapsed by default. Disclosure changes are browser-only. Layer/head controls remain disabled before a run and during Worker activity.

### Visualization Primitives

- Vector Strip: signed zero line, semantic color, selected feature, exact-value reel.
- Attention Matrix: raw/scaled/mask/probability modes, 44px roving-focus cells, bounded two-axis matrix scroll with selected-cell alignment, hatch/text mask cue.
- Tensor Flow: labelled shapes and paths plus an equivalent ordered HTML summary.
- Tensor Viewer: stable tensor ID, operation, shape, semantic axes, row-major flat index, selected value, bounded slice, and full score/value contribution tables.
- Source Correspondence: pinned nanoGPT lines, commit, MIT link, and Rust counterpart in a bounded source viewport.

## 6. Interaction and Motion

`--micro` is `120ms ease-out`; `--standard` is `220ms ease-in-out`. Motion only communicates interaction or trace arrival and uses transform, opacity, or filter. Stage movement retains initiator focus. `prefers-reduced-motion: reduce` makes transitions and animation effectively zero while preserving every state and playback control.

## 7. Accessibility Constraints

- Target WCAG 2.2 AA: body and secondary text at least 4.5:1; semantic graphics at least 3:1.
- Every visible button, textarea, and link has a minimum 44x44px target.
- Visible `:focus-visible` uses a 2px focus ring with offset.
- Skip link targets Main Stage. Lifecycle and stage changes are polite live regions; errors use alert semantics.
- Heatmaps implement grid semantics and roving keyboard focus. Inspector tabs implement tablist/tab/tabpanel semantics.
- CJK copy must not clip at 390, 1024, or 1440px widths.
- Autoplay never starts automatically and all motion remains manually stoppable.

## 8. Accepted Debt

None for this phase. Model arithmetic, Worker protocol behavior, static deployment boundaries, and numerical parity remain outside visual-state ownership and unchanged.
