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

- Page mesh tokens: parchment `#f6f0e8`, clay `#c75b3f`, amber `#d2a34a`, sage
  `#78907e`, and slate `#748c95`. Distinct fields remain visibly identifiable: clay/amber
  establish action and explanation zones, while sage/slate establish data and diagram zones.
  Gradients never collapse into one beige wash or become decorative stripes and button fills.
- Minimal surfaces use whitespace first, one warm hairline second, and translucent ivory only when
  content needs contrast. Nested cards, repeated rounded containers, and persistent elevation are
  removed. Blur is reserved for floating viewport controls where it protects legibility.
- Architecture nodes reuse the same mesh palette: normalization=amber, attention=slate,
  embedding=sage, MLP=clay, residual/state=parchment. Saturation marks meaning, not decoration.
- UI typography prefers `Avenir Next`, then Korean-native `Noto Sans KR` or
  `Apple SD Gothic Neo`, with the platform sans stack as the final fallback.
- Header exposes product identity, `학습`, `모델 실험실`, and one live Worker status.
- Course Home gives the registered decoder-only course the only primary CTA,
  an outlined Lab route, and a text-level in-page contents action.
- Learn shows one Chapter H1, one subtitle, compact progress and ToC, then a centered
  explanation-first article.
- Learn never reserves a permanent Diagram pane. One concept-specific action opens a large
  focused Diagram viewer; Self-Attention adds one separate actual Score Matrix action.
- Article sections use typography, whitespace, dividers, formulas, examples, and restrained
  callouts rather than nested dashboard cards. Runtime facts collapse under implementation notes.
- Prompt and generation controls exist only in Lab.
- Lab is one centered experiment flow: Prompt, controls, continuation, replay, and current-run
  inspection actions. Architecture and Score Matrix content open through the shared viewer.
- Architecture diagrams own the primary canvas; annotations support rather than compete with flow.
- The page atmosphere uses a warm terracotta, amber, and sage gradient mesh behind translucent
  paper surfaces. It never uses the generic purple-blue AI gradient.
- Drill-down nodes communicate capability through label, shape, focus, and indicator, not color
  alone.
- Symbolic shapes stay in diagrams. Current model/trace values stay in annotation panels or the
  optional data-visualization pane.
- Generated prompt/continuation text is literal text, never mathematical markup.

Root, Block, and Attention geometry is deterministic and covered by browser probes. Connectors may
not cross unrelated operation nodes, and residual paths retain explicit `+` junctions.

## Responsive behavior

- Desktop, tablet, and mobile share one content-first Learn model. The page owns scrolling;
  Diagram and Guide never become independent scroll panes.
- The article is centered at a maximum inline size of 56rem. Wide comparison or callout content
  may use that full measure, while Korean paragraphs remain comfortably readable.
- Lab uses one centered instrument column with a maximum inline size of 72rem.
- `FocusedViewerOverlay` uses one application-level `OverlayHost`. Desktop surfaces occupy about
  90vw by 86dvh; mobile uses an almost full-screen surface with the same local controls.
- The backdrop is warm and translucent, the surface is solid with a thin border and restrained
  shadow, and only one primary viewer can exist at a time.
- ThreeUI commit `326580429881c2abe7893bee53c62cbb31b6ee49` informs compact local controls,
  isolated renderer surfaces, ResizeObserver cleanup, visibility-aware rendering, and disposal.
  Its package, shaders, fonts, showcase chrome, and decorative scenes are not copied.
- Korean copy, formulas, and status detail may not clip at any supported breakpoint.

No breakpoint changes model state or Worker ownership.

## Hybrid visualization

- Semantic SVG/DOM/KaTeX explains architecture, operation order, labels, connectors, curriculum,
  and formulas.
- Three.js and React Three Fiber render only validated numerical tensors. They never replace
  Course Home, GPT, Block, Self-Attention, or curriculum architecture diagrams.
- Every Diagram is wrapped by the generic `DiagramViewport`. The viewer header and local route
  controls sit outside a visual-only SVG canvas; captions and explanatory copy never scale or pan
  with the diagram.
- Fit contains the complete SVG on both axes and is the semantic `100%` baseline even when its
  internal physical scale is smaller than one. Compact translucent zoom-out, zoom-in, and Fit
  controls overlay the canvas corner without adding a separate toolbar row.
- Ctrl+wheel zoom stays pointer-centered; normal wheel remains page or viewer scrolling; drag pan
  activates only above Fit.
- This milestone registers one renderer: the actual-trace Attention Score Matrix. It uses signed
  height, a semantic negative/neutral/positive legend, hover, persistent selection, and bounded
  camera controls.
- Three.js and Fiber load through a literal dynamic import only after the Visualization viewer
  opens and requests trace data.
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
- Focused viewers are ephemeral state in this milestone and do not add history entries.
- Buttons and inputs use native semantics; Worker lifecycle uses `status` and `alert` roles.
- Selected state and drill-down capability have non-color cues.
- Math exposes MathML plus an accessible label.
- Reduced-motion preferences disable nonessential transitions.
- Learn focus order follows global navigation, compact Chapter navigation, article content, then
  concept-specific viewer actions.
- Lab focus order follows Prompt, generation, output/replay, then inspection actions.
- Opening a focused viewer moves focus to Close, traps Tab, makes the application inert, locks
  page scroll, and restores the exact trigger on Close or Escape.
- A Learn section action opens the viewer with its matching node highlighted;
  `설명에서 보기` closes the viewer and focuses the article heading.
- Diagram viewers support Fit, zoom, pan, Ctrl+Wheel, and `+`, `-`, `F`, or `0` keyboard controls.

## Runtime evidence

React renders only validated model metadata and typed Worker responses. Unknown payloads fail
closed. Missing traces display pending/unknown values rather than inferred tensors or dimensions.
Generation replay selects stored Worker evidence without resampling.
