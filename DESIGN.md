# Transformer Viz Design System

## 0. Research Log

- Embedded refs: shortlisted Claude, IBM Carbon, and Observable-style data tools; picked `taste-skill` + Claude because the warm editorial surface makes dense model internals approachable without looking like a generic dark AI dashboard.
- Lazyweb: 3 queries, 3 screens viewed (Observe, Coralogix, Impact); adopted a strong status/header layer, one dominant analysis surface, and compact supporting rails. The blank Impact capture was rejected as unusable evidence.
- StyleGallery: adopted `panel-layout` for predictable main and utility regions. Document scroll owns vertical movement; panels never create nested page scrollbars.
- Interaction references: beui `button` and `tabs`; retained immediate state feedback and a moving selected-state treatment, implemented with CSS color/transform transitions and an instant reduced-motion path.
- Imagen drafts: skipped because this harness has no image generation tool. The live real-trace SVG visualization is the product focal object, so no decorative substitute is introduced.

## 1. Atmosphere & Identity

A warm scientific notebook with the precision of an oscilloscope. The interface should make a tiny Transformer feel inspectable rather than magical. Its signature is a terracotta data path that connects token chips, model blocks, attention cells, and tensor values on a parchment canvas.

## 2. Color

| Role | Token | Value | Usage |
|---|---|---|---|
| Canvas | `--canvas` | `#f3f0e8` | Page background |
| Surface | `--surface` | `#fbfaf6` | Primary panels |
| Surface strong | `--surface-strong` | `#e9e4d8` | Selected and nested regions |
| Ink | `--ink` | `#22221f` | Primary text |
| Ink muted | `--ink-muted` | `#68665f` | Explanations and metadata |
| Hairline | `--hairline` | `#d7d1c4` | Structural separators |
| Accent | `--accent` | `#a94327` | Interactive state and data path |
| Accent soft | `--accent-soft` | `#f0d3c8` | Selected backgrounds |
| Positive | `--positive` | `#27614f` | Ready and allowed state |
| Warning | `--warning` | `#8a5a12` | Loading and caution |
| Error | `--error` | `#a12d2d` | User-visible errors |
| Future | `--future` | `#8b8982` | Masked future cells with hatch cue |
| Focus | `--focus` | `#1769aa` | Accessible keyboard focus |

Accent is reserved for interaction and the selected computational path. Heatmap values use an ink-to-terracotta sequential ramp; future-mask cells also use diagonal hatching so color is never the only cue.

## 3. Typography

| Level | Size | Weight | Line height | Usage |
|---|---:|---:|---:|---|
| H1 | `1.75rem` | 650 | 1.15 | Product title |
| H2 | `1.25rem` | 650 | 1.25 | Panel title |
| H3 | `1rem` | 650 | 1.35 | View heading |
| Body | `0.9375rem` | 400 | 1.6 | Korean explanatory text |
| Small | `0.8125rem` | 450 | 1.5 | Metadata and controls |
| Caption | `0.75rem` | 550 | 1.4 | Tensor labels |

- UI stack: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`.
- Numeric stack: `ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`.
- System fonts avoid external requests and preserve Korean glyph coverage.

## 4. Spacing & Layout

Base unit is 4px. Tokens: `--s1: 4px`, `--s2: 8px`, `--s3: 12px`, `--s4: 16px`, `--s5: 20px`, `--s6: 24px`, `--s8: 32px`, `--s10: 40px`.

- Max workspace width: 1600px with 16px mobile and 24px desktop gutters.
- Desktop: three-column workspace `minmax(220px, .78fr) minmax(420px, 1.55fr) minmax(260px, .9fr)`.
- Tablet: overview spans full width, detail and inspector form two columns.
- Mobile DOM and visual order: header, prompt/status, token timeline, model overview, selected detail, tensor/MLP/logits, source placeholder, playback placeholder.
- Document scroll is the only vertical scroll owner. Heatmap may own horizontal overflow on narrow screens and remains keyboard reachable.

## 5. Components

### Panel
- **Structure**: semantic `section` with heading and optional action cluster.
- **States**: default, selected, loading, empty, error.
- **Spacing**: `--s4` mobile, `--s5` desktop.
- **Accessibility**: labelled section; status changes use a dedicated live region.
- **Motion**: opacity only for arriving real trace data; instant under reduced motion.
- **Layout**: stack; document owns scroll.

### Primary Action and Selectors
- **Structure**: labelled input/select/button controls, never placeholder-only labels.
- **States**: default, hover, active, focus-visible, disabled, loading.
- **Accessibility**: 44px minimum touch target and visible focus ring.
- **Motion**: 120ms transform/colour feedback; disabled under reduced motion.

### Token Timeline
- **Structure**: ordered list of token buttons with index, display, and vocabulary ID.
- **States**: default, selected, focus, BOS/EOS.
- **Accessibility**: `aria-current` marks selection; labels expose exact token position and ID.
- **Layout**: wrapping cluster, no horizontal-only dependency.

### Model Tree
- **Structure**: GPT root, repeated block buttons, attention/head branch, tensor leaf.
- **States**: default, current layer, current drill-down level.
- **Accessibility**: semantic buttons and `aria-current`; indentation is not the only hierarchy cue.
- **Layout**: ordered stack.

### Attention Heatmap
- **Structure**: SVG with title/description, row and column labels, roving-focus cell buttons overlaid in a CSS grid, numeric legend, selected-cell detail.
- **States**: probability intensity, masked future hatch, selected border, keyboard focus.
- **Accessibility**: rows are query and columns key; arrow keys move one cell; each cell label includes query, key, head, mask, and probability.
- **Layout**: square frame with horizontal overflow on mobile only.

### Tensor Viewer
- **Structure**: tensor identity/shape/dtype, statistics, high-precision selected value, bounded row-major slice.
- **Variants**: scalar, vector, matrix, higher-rank slice.
- **Accessibility**: real table for matrix values and explicit row/column labels.
- **Layout**: intrinsic grid; no canvas-only information.

### Source Correspondence
- **Structure**: original nanoGPT symbol, pinned SHA, highlighted numbered `model.py` range, MIT link, and Rust file/symbol counterpart.
- **States**: one active range synchronized to the selected playback operation; parse failure is a visible typed error.
- **Accessibility**: semantic code lines expose line numbers as text; the active range uses weight and a left rule in addition to colour.
- **Layout**: bounded source viewport owns horizontal overflow, while document scroll remains the vertical owner.

### Data-path Transport
- **Structure**: 18 numbered real Worker tensor boundaries with 처음/이전/재생·정지/다음/마지막 controls and 0.5x/1x/2x rate selection.
- **States**: paused, playing, first bound, last bound, and selected operation.
- **Accessibility**: transport is a labelled group, current step uses `aria-current`, and a polite live region announces formula, shape, and tensor.
- **Motion**: a deterministic 250ms clock advances explanatory state; reduced motion keeps the same state transitions without animated interpolation.

## 6. Motion & Interaction

| Token | Value | Usage |
|---|---|---|
| `--micro` | `120ms ease-out` | Press, focus, selected state |
| `--standard` | `220ms ease-in-out` | Real trace panel arrival |

Motion communicates state changes only. Buttons translate by 1px while pressed; trace panels fade in when Worker data arrives. Playback advances real data-path state on a deterministic 250ms clock at a rate-derived cadence. `prefers-reduced-motion: reduce` removes transitions and transforms without disabling playback or hiding state.

## 7. Depth & Surface

Mixed warm ring and tonal-shift strategy. Standard panels use a 1px warm hairline and `0 1px 0 rgb(255 255 255 / .65)` inset highlight. The selected panel adds a restrained warm shadow. No glass, glow, or cool gray.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- WCAG 2.2 AA, 4.5:1 body contrast and 3:1 large text/graphics.
- All controls keyboard reachable with 2px visible focus.
- Heatmap future cells use hatch plus text, not color alone.
- SVG visualization includes `title` and `desc`; detailed values remain available as HTML.
- Korean copy uses natural wrapping, with short labels protected from orphaning.
- Reduced motion is respected and no essential meaning depends on animation.

### Accepted Debt

| Item | Location | Why accepted | Owner / Exit |
|---|---|---|---|
| None | — | Phase I replaced the reserved source/playback locations with pinned source correspondence and real trace transport | Reassess when a new operation is added |
