# React UI design contract

## Approved surfaces

Shipping UI contains one generation surface and three architecture depths:

1. Root Architecture shows token/position embedding, repeated Transformer Blocks, final
   normalization, logits, token selection, and append-to-context flow.
2. Transformer Block Detail shows the ordered Pre-LN attention and MLP residual paths.
3. Self-Attention Detail shows QKV projection, split heads, scores, scale, causal mask, softmax,
   value aggregation, merge, and output projection.

Architecture drill-down, breadcrumbs, layer/head selection, and operation selection are pure React
state. They preserve prompt and generation state and send no Worker request unless a user explicitly
selects retained trace evidence.

## Visual hierarchy

- Header exposes product identity and one live Worker status.
- Prompt and generation controls remain ahead of architecture content in DOM and visual order.
- Architecture diagrams own the primary canvas; annotations support rather than compete with flow.
- Drill-down nodes communicate capability through label, shape, focus, and indicator, not color
  alone.
- Symbolic shapes stay in diagrams. Current model/trace values stay in annotation panels.
- Generated prompt/continuation text is literal text, never mathematical markup.

Root, Block, and Attention geometry is deterministic and covered by browser probes. Connectors may
not cross unrelated operation nodes, and residual paths retain explicit `+` junctions.

## Responsive behavior

- Desktop uses the full available width without document horizontal overflow.
- Tablet preserves readable diagram and annotation regions, allowing local diagram scrolling where
  required.
- Mobile uses document vertical flow and local inline scrolling for wide diagrams; controls,
  Korean copy, formulas, and status detail may not clip.
- Startup shell and ready/error surfaces remain usable at 390x844.

No breakpoint changes model state or Worker ownership.

## Math rendering

Only entries from the trusted `formulaCatalog` reach KaTeX. Each formula stores:

- canonical TeX for KaTeX,
- plain text for diagrams/fallbacks and non-math comparisons,
- an accessible label.

KaTeX runs with `trust: false`, `throwOnError: false`, and `htmlAndMathml`. Invalid catalog entries
fall back to plain text and log once in development. Prompt text, model output, Worker errors, source
copy, and arbitrary runtime strings never enter KaTeX.

## Interaction and accessibility

- Every interactive SVG group has keyboard activation, visible focus, and an accessible operation
  name.
- Buttons and inputs use native semantics; Worker lifecycle uses `status` and `alert` roles.
- Selected state and drill-down capability have non-color cues.
- Math exposes MathML plus an accessible label.
- Reduced-motion preferences disable nonessential transitions.
- Focus order follows prompt, generation, Root, Block, and Attention content.

## Runtime evidence

React renders only validated model metadata and typed Worker responses. Unknown payloads fail
closed. Missing traces display pending/unknown values rather than inferred tensors or dimensions.
Generation replay selects stored Worker evidence without resampling.
