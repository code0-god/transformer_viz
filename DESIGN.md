# Transformer Viz Design System

## 0. Research Log

- Embedded refs: shortlisted Claude, IBM Carbon, and Observable-style data tools; picked `taste-skill` + Claude because the warm editorial surface makes dense model internals approachable without looking like a generic dark AI dashboard.
- Lazyweb: 3 queries, 3 screens viewed (Observe, Coralogix, Impact); adopted a strong status/header layer, one dominant analysis surface, and compact supporting rails. The blank Impact capture was rejected as unusable evidence.
- StyleGallery: adopted `scroll-body-shell` for the bounded desktop player, `panel-layout` plus `main-with-rail` for the three-region workspace, and `reel` for the horizontally accessible stage rail. Desktop Inspector owns vertical detail scroll; mobile returns vertical ownership to the document.
- Interaction references: beui `button`, `tabs`, and `bouncy-accordion`; adapted their explicit press, selected-indicator, and disclosure states to Leptos plus CSS without adding a motion dependency. Reduced motion keeps every state change and removes interpolation.
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
| Query | `--query` | `#1769aa` | Q marker and query evidence |
| Key | `--key` | `#27614f` | K marker and key evidence |
| Value | `--value` | `#6d4c8d` | V marker and value evidence |
| Score path | `--score-path` | `#a94327` | QK score products and computational paths |
| Mask hatch | `--mask-ink` | `#6f6d66` | Future-cell hatch and text cue |
| Probability low | `--probability-low` | `#f3dfd6` | Sequential probability ramp floor |
| Probability high | `--probability-high` | `#8f2f20` | Sequential probability ramp ceiling |
| Residual | `--residual` | `#a66616` | Residual additions and stream continuity |
| MLP | `--mlp` | `#147369` | MLP expansion, GELU, and projection |
| Prediction ink | `--prediction-ink` | `#25231f` | Tied-head geometry and prediction labels |
| Prediction gold | `--prediction-gold` | `#a77a1f` | Tied embedding weight and ranked output accent |

Accent is reserved for interaction and the selected computational path. Query, key, and value colors always pair with `Q`, `K`, and `V` text markers and distinct silhouettes. Heatmap values use an ink-to-terracotta sequential ramp; future-mask cells also use diagonal hatching so color is never the only cue.

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
- Desktop player is a bounded `100dvb` scroll-body shell: compact header, prompt/context rows, `minmax(0, 1fr)` workspace, and Stage Rail. The document does not scroll at 1440×900.
- Desktop workspace areas are Model Mini Map, dominant Main Stage, and Inspector:
  `minmax(12rem, .62fr) minmax(32rem, 1.9fr) minmax(19rem, .86fr)`.
- Main Stage is first in DOM order. CSS places Model Mini Map at inline-start and Inspector at inline-end on desktop without changing focus order.
- Inspector owns desktop detail scroll. The named `.stage-visual` data region may own bounded vertical overflow only for content-dense real-trace stages (mask, value/residual, MLP/residual, prediction); source code, tensor tables, heatmaps, token strips, vector values, and Stage Rail may own bounded horizontal overflow for their named content.
- Tablet reduces Model Mini Map to compact architecture controls and moves Inspector below Main Stage when three regions no longer fit.
- Mobile returns vertical scrolling to the document. DOM and visual order are Main Stage, Stage Rail, compact model navigation, then Inspector; this keeps the current learning concept first.
- Every bounded grid or flex scroll child uses `min-block-size: 0`; intrinsic tracks use `minmax(min(..., 100%), 1fr)` to prevent narrow-screen overflow.

## 5. Components

### Guided Player Shell
- **Structure**: compact Status Header, accessible Prompt Drawer, sticky Context Bar, Main Stage, Model Mini Map, Inspector, and nine-step Stage Rail.
- **States**: model loading, ready, running, complete, recoverable error, empty trace.
- **Layout**: bounded desktop shell; stage-first document flow on mobile.
- **Accessibility**: skip link targets Main Stage; source order follows the mobile learning order; all status changes use named live regions.
- **Depth**: region hierarchy comes from warm tonal shifts and hairlines, not repeated equal-weight cards.

### Prompt Drawer
- **Structure**: one disclosure button plus labelled textarea and run action.
- **States**: expanded before first run, collapsed after a completed run, loading, running, error.
- **Accessibility**: disclosure exposes `aria-expanded` and `aria-controls`; collapsed errors remain visible with a direct recovery action.
- **Motion**: content swaps immediately under reduced motion; otherwise opacity only.

### Context Bar
- **Structure**: token strip, selected query/key markers, breadcrumb, and current Layer/Head coordinates.
- **States**: empty before a run, selected query, selected key, same-token query/key, loading detail.
- **Accessibility**: `Q`/`K` text and distinct marker shapes supplement color; every token button names index, token ID, and role.
- **Layout**: sticky shell row on desktop; horizontally bounded token reel on narrow screens.

### Main Stage
- **Structure**: stage count, large stage title, purpose, formula, one dominant data graphic, current-value evidence, and next-stage bridge.
- **States**: nine `NarrativeStage` variants, loading detail, recoverable missing tensor.
- **Layout**: widest workspace region and first mobile region; graphics may scroll inline but primary prose never does.
- **Accessibility**: stage changes announce through a polite live region; SVG has title/description and equivalent HTML values.

### Inspector
- **Structure**: Explanation, Tensor, and Source tabs with one visible tabpanel, followed by one collapsed current-stage Detail Operation Disclosure.
- **States**: selected tab, keyboard focus, selected stable tensor operation, selected global feature, loading trace, typed empty state, source failure.
- **Accessibility**: ARIA tablist/tab/tabpanel contract with wrapping Arrow keys plus Home/End roving focus; operation and feature buttons expose pressed state; either selection preserves narrative stage, playback, lifecycle status, and focus context.
- **Layout**: owns desktop vertical scroll; the bounded math tables, feature/slice reels, and pinned source viewport own their named horizontal scroll. Inspector remains supporting evidence and never duplicates the Main Stage diagram.

### Stage Rail
- **Structure**: Previous, play/pause, Next, speed selector, and nine labelled stage buttons.
- **States**: selected, completed, future, playing, first/last boundary, 0.5x/1x/2x.
- **Accessibility**: current stage uses `aria-current="step"`; controls remain at least 44px; rail is a keyboard-reachable horizontal reel.
- **Motion**: deterministic 250ms clock; approximately 2.5s, 1.5s, or 0.75s per stage. Playback never starts on load and stops at stage nine.

### Panel
- **Structure**: semantic `section` with heading and optional action cluster.
- **States**: default, selected, loading, empty, error.
- **Spacing**: `--s4` mobile, `--s5` desktop.
- **Accessibility**: labelled section; status changes use a dedicated live region.
- **Motion**: opacity only for arriving real trace data; instant under reduced motion.
- **Layout**: supporting content only; never reconstruct the old equal-weight dashboard grid.

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

### Model Mini Map
- **Structure**: GPT root, configuration-derived block buttons, attention/head branch, tensor leaf.
- **States**: default, current layer, current drill-down level.
- **Accessibility**: semantic buttons and `aria-current`; indentation is not the only hierarchy cue.
- **Layout**: ordered desktop stack and compact tablet/mobile disclosure; no hard-coded layer, head, or embedding dimensions.

### Vector Strip
- **Structure**: all feature dimensions around a signed zero line, shared comparison scale, selected-feature mark, stable tensor identity, and equivalent HTML values.
- **States**: query, key, value, score, residual, MLP, and prediction semantic tones.
- **Accessibility**: SVG title/description names sign and scale; every exact feature value remains available in the adjacent ordered list.
- **Layout**: SVG is fluid while the exact-value reel owns bounded horizontal overflow.

### Attention Matrix
- **Structure**: one reusable raw, scaled, mask, or probability heatmap with query rows, key columns, real cell buttons, legend, and stable tensor identity.
- **States**: selected cell, roving keyboard focus, signed magnitude, probability ramp, and hatched future mask.
- **Accessibility**: arrows move one cell; labels include q/k/head/value/mask state; hatch and `mask` text supplement color.
- **Interaction**: cell pointer/arrow selection is the only stage primitive allowed to request token detail; stage navigation remains local UI state.
- **Layout**: matrix frame owns bounded horizontal overflow on narrow screens.

### Tensor Flow
- **Structure**: labelled geometric nodes and paths paired with an ordered HTML shape summary.
- **States**: score path, value, residual, MLP, and prediction semantic tones.
- **Accessibility**: SVG title/description and duplicate HTML labels/shapes; no meaning depends on path color.

### Formula and Tensor Facts
- **Structure**: formula band, stable tensor ID, label, shape, mean, and standard deviation.
- **States**: ready, typed missing trace, and loading.
- **Accessibility**: semantic definition lists and explicit error text.

### Tensor Viewer
- **Structure**: stable tensor identity/label/shape/dtype/operation, statistics, typed semantic axes, checked flat index, high-precision selected value, global feature selectors, and bounded row-major slice.
- **Variants**: rank-1 vector, `[B,T,C]` token-feature, captured `[1,1,T,D]` head-token-feature, and `[1,1,T,T]` query-key matrix cell; malformed boundaries become typed visible empty states.
- **Evidence tables**: Attention Score shows every `Qᵢ`, `Kᵢ`, product, sum, captured raw, scaling, and error; Value + Residual shows every real key by every head feature plus per-feature sum and captured output without truncation.
- **Accessibility**: semantic pressed feature controls, table captions, scoped row/column headers, and selected row/feature styling that does not depend on color alone.
- **Layout**: identity remains in flow; slices and full evidence tables own bounded horizontal overflow, and large tables also own a named bounded vertical viewport.

### Source Correspondence
- **Structure**: original nanoGPT symbol, pinned SHA, highlighted numbered `model.py` range, MIT link, and Rust file/symbol counterpart.
- **States**: one active range synchronized to the selected playback operation; parse failure is a visible typed error.
- **Accessibility**: semantic code lines expose line numbers as text; the active range uses weight and a left rule in addition to colour.
- **Layout**: bounded source viewport owns horizontal overflow, while document scroll remains the vertical owner.

### Detail Operation Disclosure
- **Structure**: the existing 18 Worker tensor boundaries remain grouped under their owning narrative stage.
- **States**: collapsed by default, one optional selected operation, loading detail.
- **Accessibility**: selecting a detail source never changes the current narrative stage.
- **Layout**: lives inside Inspector rather than as a second primary transport.

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
