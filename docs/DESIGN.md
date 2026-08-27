# React UI design contract

## Approved surfaces

Shipping UI contains three top-level views and three architecture depths:

1. Course Home introduces the single registered learning track and one primary start action.
2. Learn renders one URL-addressable Chapter at a time without generation controls.
3. Lab preserves Prompt, generation, continuation, replay, and Architecture exploration.
4. Root Architecture shows token/position embedding, repeated Transformer Blocks, final
   normalization, logits, token selection, and append-to-context flow.
5. Transformer Block Detail shows the ordered Pre-LN attention and MLP residual paths.
6. Self-Attention Detail shows QKV projection, split heads, scores, scale, causal mask, softmax,
   value aggregation, merge, and output projection.

Course Home, Chapter, and Lab use GitHub Pages-safe hash routes. Architecture drill-down,
breadcrumbs, layer/head selection, and operation selection remain React state inside Lab. They
preserve prompt and generation state and send no Worker request unless a user explicitly selects
retained trace evidence.

## Visual hierarchy

- Header exposes product identity, `학습`, `모델 실험실`, and one live Worker status.
- Course Home gives the registered decoder-only course the only primary CTA.
- Learn shows one Chapter H1, one subtitle, progress, and ToC before the Learning Workspace.
- Prompt and generation controls exist only in Lab.
- Architecture diagrams own the primary canvas; annotations support rather than compete with flow.
- Drill-down nodes communicate capability through label, shape, focus, and indicator, not color
  alone.
- Symbolic shapes stay in diagrams. Current model/trace values stay in annotation panels.
- Generated prompt/continuation text is literal text, never mathematical markup.

Root, Block, and Attention geometry is deterministic and covered by browser probes. Connectors may
not cross unrelated operation nodes, and residual paths retain explicit `+` junctions.

## Responsive behavior

- Desktop Learn is a bounded `scroll-body-shell`: Chapter header remains visible, the 48:52
  Workspace body clips page overflow, Diagram is static, and Guide alone owns vertical scrolling.
- Desktop never uses `position: sticky` for a Learning Diagram.
- Tablet and mobile reflow Diagram before Guide into normal document flow, allowing local Diagram
  scrolling only when required.
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
- Header navigation exposes current view. Chapter ToC exposes `aria-current="page"`.
- Hash changes and browser Back/Forward restore Home, Chapter, and Lab without focus loops.
- Buttons and inputs use native semantics; Worker lifecycle uses `status` and `alert` roles.
- Selected state and drill-down capability have non-color cues.
- Math exposes MathML plus an accessible label.
- Reduced-motion preferences disable nonessential transitions.
- Learn focus order follows global navigation, Chapter navigation, Diagram, then Guide.
- Lab focus order follows Prompt, generation, Root, Block, and Attention content.

## Runtime evidence

React renders only validated model metadata and typed Worker responses. Unknown payloads fail
closed. Missing traces display pending/unknown values rather than inferred tensors or dimensions.
Generation replay selects stored Worker evidence without resampling.
