# Transformer Viz — Architecture-First Phase 1

## Product thesis

Transformer Viz opens on one dominant diagram: the complete GPT text-generation architecture.

First-time readers should understand within seconds:

1. tokens enter the model,
2. token and position embeddings combine,
3. every configured Transformer block runs,
4. final LayerNorm and LM Head produce logits,
5. sampling chooses one token,
6. that token joins the context,
7. the full context runs through the model again.

This phase removes the previous dashboard and stage-player interaction model. It does not implement operation-level drill-down.

## First-screen hierarchy

1. Compact product header and model lifecycle.
2. Prompt plus one primary Generate or Stop action.
3. Compact generated continuation with optional token details.
4. Dominant centered vertical architecture canvas.
5. Compact contextual structure annotation.

Architecture must carry more visual weight than prompt controls and generated text.

## Removed default UI

These regions do not render on the Phase 1 screen:

- persistent Architecture Map sidebar,
- persistent Inspector,
- current Stage Canvas,
- Guided / Explore tabs,
- 21-step curriculum rail,
- Previous / Play / Next controls,
- playback speed controls,
- operation button grid,
- persistent trace instrumentation panels.

Their model and trace data may remain in source for later phases.

## Architecture diagram

Diagram uses semantic SVG with one centered top-to-bottom forward spine and an outer repeat path.

Required nodes:

- Input Context,
- separate Token Embedding and Position Embedding branches that merge at an addition node,
- one `Transformer Block × N` container where `N` comes from `model.config.n_layer`,
- Final LayerNorm,
- LM Head,
- Logits,
- Token Selection,
- Generated Token,
- Append to Context.

Repeat path returns from appended context to input. It is labeled `CONTEXT UPDATE`; its arrow points
from `Append to Context` toward `Input Context`. `FULL FORWARD` labels the normal top-to-bottom
calculation path, never the return arrow.

### Accuracy

The repeated Block container includes LN1, causal multi-head self-attention, the first residual
add, LN2, MLP, and the second residual add. Each residual is rendered as a skip path into its add
node. Final LayerNorm remains outside the repeated container. Generated context is forwarded again
because current runtime has no KV cache.

### Node roles

- Input: soft violet context node.
- Embedding: soft green process nodes.
- Transformer block: one larger soft-blue repeated container with explicit residual routes.
- Final normalization and projection: soft yellow and violet process nodes.
- Selection: soft amber sampling node.
- Generated token: terracotta-accented token node.
- Append: green context node.

Forward connectors are solid. Repeat connector is a dashed orthogonal context-update path with one
arrowhead at Input Context.

## Navigation

Architecture selection is independent from legacy narrative-stage state.

Phase 1 locations:

- `GPT`,
- `GPT / Block N`.

Root Block remains non-interactive until drill-down work begins.

## Generation controls

Default controls:

- Prompt,
- Generate.

While generation runs, Stop occupies the primary action position.

Settings disclosure contains:

- max new tokens,
- temperature,
- Top-K,
- mode,
- seed.

Generated continuation stays compact. Prompt and generated token reels remain available inside `Token details`.

## Visual system

- Background: warm parchment.
- Surfaces: off-white paper.
- Text: near-black ink.
- Accent: terracotta.
- Success: muted green.
- Structure: thin warm-gray hairlines.
- Evidence labels: monospace.
- Corners: restrained rounded rectangles and capsules.
- Shadows: low-contrast depth only around primary surfaces.

No gradient decoration or grid texture.

## Responsive behavior

### Desktop, at least 1100px

- content width up to 1440px,
- architecture shell spans page width,
- diagram uses at least 75% of content width,
- complete two-layer model and repeat path fit inside 1440×900.

### Tablet, 768–1099px

- same document order,
- architecture remains wide,
- small local diagram overflow is acceptable,
- no sidebar or drawer replaces the canvas.

### Mobile, below 768px

- header and prompt stack,
- document itself has no horizontal overflow,
- architecture canvas owns local horizontal scrolling,
- labels retain readable size,
- selected block remains keyboard reachable.

## Accessibility

- Skip link targets architecture main content.
- Diagram includes `<title>` and `<desc>`.
- Block nodes use `role="button"`, `tabindex="0"`, Enter/Space activation, `aria-label`, and `aria-pressed`.
- Selected state uses border weight and fill, not color alone.
- GPT breadcrumb is a native button.
- Architecture scroll region is keyboard focusable.
- Focus indicators remain visible.
- Status changes use appropriate live-region semantics.
- Reduced-motion preference disables loading animation.

## Loading and failure states

- Static startup shell describes architecture loading, not Guided curriculum.
- Loading view does not invent model dimensions.
- Ready diagram derives layer count and dimensions from loaded metadata.
- Worker errors expose full recovery text and disable Generate.

## Explicit Phase 1 exclusions

Do not render or implement:

- block zoom-in,
- attention internals,
- Q/K/V diagrams,
- dot products,
- masks,
- softmax detail,
- value aggregation,
- MLP internals,
- Tensor Inspector,
- Source Inspector,
- Guided overlay,
- 21-step curriculum,
- architecture animation transitions.

Future work begins only after screenshot review.
