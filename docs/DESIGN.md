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
- Course Home gives the registered decoder-only course the only primary CTA,
  an outlined Lab route, and a text-level in-page contents action.
- Learn shows one Chapter H1, one subtitle, progress, and ToC before the Learning Workspace.
- Learn keeps Diagram on the left. Its right pane shows a book-like Explanation by default and
  exposes an understated Visualization tab only when the selected concept registers a renderer.
- Prompt and generation controls exist only in Lab.
- Architecture diagrams own the primary canvas; annotations support rather than compete with flow.
- Drill-down nodes communicate capability through label, shape, focus, and indicator, not color
  alone.
- Symbolic shapes stay in diagrams. Current model/trace values stay in annotation panels or the
  optional data-visualization pane.
- Generated prompt/continuation text is literal text, never mathematical markup.

Root, Block, and Attention geometry is deterministic and covered by browser probes. Connectors may
not cross unrelated operation nodes, and residual paths retain explicit `+` junctions.

## Responsive behavior

- Desktop Learn is a bounded `scroll-body-shell`: Chapter header remains visible, the 48:52
  Workspace body clips page overflow, Diagram is static, and the active right pane alone owns
  vertical scrolling.
- Layout mechanics combine StyleGallery's `split-screen` and `scroll-body-shell` contracts:
  <https://github.com/changeroa/StyleGallery/blob/main/patterns/split-sidebar/split-screen.md> and
  <https://github.com/changeroa/StyleGallery/blob/main/patterns/viewport-shell/scroll-body-shell.md>.
  The right pane is the named desktop scroll owner; mobile returns to document flow.
- Desktop never uses `position: sticky` for a Learning Diagram.
- Tablet and mobile reflow Diagram before Explanation or Visualization into normal document flow,
  allowing local Diagram scrolling only when required.
- Mobile uses document vertical flow and local inline scrolling for wide diagrams; controls,
  Korean copy, formulas, and status detail may not clip.
- Startup shell and ready/error surfaces remain usable at 390x844.

No breakpoint changes model state or Worker ownership.

## Hybrid visualization

- Semantic SVG/DOM/KaTeX explains architecture, operation order, labels, connectors, curriculum,
  and formulas.
- Three.js and React Three Fiber render only validated numerical tensors. They never replace
  Course Home, GPT, Block, Self-Attention, or curriculum architecture diagrams.
- Every Diagram is wrapped by the generic `DiagramViewport`, starts fitted, and provides 44px
  zoom-out, zoom-in, and Fit controls. Ctrl+wheel zoom stays pointer-centered; normal wheel remains
  page/right-pane scrolling; drag pan activates only above Fit.
- This milestone registers one renderer: the actual-trace Attention Score Matrix. It uses signed
  height, a semantic negative/neutral/positive legend, hover, persistent selection, and bounded
  camera controls.
- Three.js and Fiber load through a literal dynamic import only after Visualization activation.
  Canvas uses `frameloop="demand"` and a 1–2 DPR clamp.
- WebGL capability failure, lazy-load failure, renderer failure, and context loss stay inside the
  visualization boundary. An exact HTML matrix table remains available throughout.

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
- Learn focus order follows global navigation, Chapter navigation, Diagram viewport controls and
  semantic nodes, right-pane tabs when present, then Explanation or Visualization content.
- Lab focus order follows Prompt, generation, Root, Block, and Attention content.

## Runtime evidence

React renders only validated model metadata and typed Worker responses. Unknown payloads fail
closed. Missing traces display pending/unknown values rather than inferred tensors or dimensions.
Generation replay selects stored Worker evidence without resampling.
