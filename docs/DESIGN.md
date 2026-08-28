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

## Learn / Lab visualization contract

Learn is `Article + Inline Figure`.

- Content owns placement through `GuideBlock.kind = "figure"`.
- The active track resolves `figureId` through `LearningFigureRegistry`.
- `LearningFigure` emits semantic `<figure>` and `<figcaption>` markup.
- `prose`, `wide`, and `full` variants separate reading measure from Figure
  measure without negative-margin breakout.
- Learn SVG/DOM Figures have no modal, backdrop, close, Fit, zoom, or pan
  chrome.
- A Figure link uses ordinary Chapter hash navigation.

Lab is `Experiment + Floating Inspection Overlay`.

- Architecture, Block, Attention, and Score Matrix requests are Lab-only.
- OverlayHost owns focus trapping, Escape/backdrop close, scroll locking, and
  trigger focus restoration.
- DiagramViewport owns Fit, zoom, and pan for inspection.
- Score Matrix owns lazy R3F loading, WebGL fallback, context-loss recovery,
  exact table fallback, and runtime provenance.

Inline Figure size ceilings are 52rem for `prose`, 64rem for `wide`, and 72rem
for `full`. Figures use transparent or subtle surfaces, restrained 4–8px
radii, no default shadow, and one conclusion sentence as caption.

## Visual hierarchy

- Course Home, Token Article + Inline Figure, GPT Article + Inline Figure, and
  Lab Score Matrix Overlay are the visual benchmarks for future work. They
  distinguish textbook explanation from runtime inspection.
- Background tokens are `--bg-page`, `--bg-article`, `--bg-overlay`, and `--surface-subtle`.
  Text uses `--text-primary`, `--text-secondary`, and `--text-tertiary`; structure uses
  `--border-subtle` and `--border-strong`.
- Accent is reserved for active navigation, primary actions, selected states, and the concept
  currently being taught. Small links, adjacent Chapter navigation, dividers, and captions stay
  neutral until hover or focus.
- Figure roles use `--figure-input`, `--figure-representation`, `--figure-operation`,
  `--figure-output`, and `--figure-highlight`. Clay, amber, sage, and slate saturation marks
  meaning rather than decorating every node.
- ThreeUI revision `326580429881c2abe7893bee53c62cbb31b6ee49` informs neutral layering,
  0.5–1px borders, 4–9px radii, compact controls, selected-state contrast, and renderer-first
  density. Its package, shaders, fonts, permanent sidebar, dark mono aesthetic, and decorative
  motion are not reused.
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
- Learn shows one Chapter H1, one learning promise, one compact Part/Chapter ordinal, a restrained
  ToC control, then a centered explanation-first article. It never repeats progress in a second
  label or bar.
- Learn never reserves a permanent Diagram pane or opens an educational
  Figure viewer. A Figure follows the paragraph or section that creates its
  need and completes the point with a caption.
- Part 0 Chapters hide the outline. Long GPT, Block, and Attention guides use the existing compact
  collapsed outline only when their section count warrants it.
- This refactor migrates Figure presentation without rewriting Part 1, Part 2,
  Block, or Attention teaching scope.
- Article sections use typography, whitespace, dividers, formulas, examples, and restrained
  callouts rather than nested dashboard cards.
- Learn contains conceptual explanation and only current-model facts needed to
  understand that concept. Implementation-language, exporter, fixture,
  provenance, transport, and schema details belong in docs or Lab diagnostics,
  never in a collapsed implementation note inside the article.
- Prompt and generation controls exist only in Lab.
- Lab is one centered experiment flow: Prompt, controls, continuation, replay, and current-run
  inspection actions. Architecture and Score Matrix content open through the shared viewer.
- Architecture diagrams own the primary canvas; annotations support rather than compete with flow.
- Article pages are near-solid warm paper. Course Home alone may use a restrained terracotta and
  sage field that remains visually weaker than its curriculum.
- Drill-down nodes communicate capability through label, shape, focus, and indicator, not color
  alone.
- Symbolic shapes stay in diagrams. Current model/trace values stay in annotation panels or the
  optional data-visualization pane.
- Generated prompt/continuation text is literal text, never mathematical markup.

Root, Block, and Attention geometry is deterministic and covered by browser probes. Connectors may
not cross unrelated operation nodes, and residual paths retain explicit `+` junctions.

## Figure grammar

Every Figure starts with one written question. Elements that do not help answer it belong in a
caption, annotation, or drill-down rather than the root composition.

Figure placement is part of guide content order, never inferred from a section
ID by a React component. SVG/DOM Figures mount only with the active Chapter.
Runtime data visualization remains Lab-owned and lazy.

Figure sizing follows three separate constraints:

- **Intrinsic composition** comes from the renderer and SVG `viewBox`.
- **Preferred display width** is Figure-specific metadata owned by the
  track registry.
- **Maximum available width** comes from the article's `prose`, `wide`, or
  `full` layout category.

The rendered graphic uses the smaller of its preferred width and available
width. Size variants define maximum presentation space, not mandatory stretch
width. Content files do not carry pixel-width overrides. Responsive layouts
shrink within the viewport and reflow before SVG labels become unreadable.

Future Self-Attention editorial work must use multiple single-question inline
Figures rather than one giant composition: overall flow, Q/K/V, score, causal
mask, softmax, and weighted value. That redesign is outside ADR 0012.

### Taxonomy and benchmark questions

- **Concept Illustration** — makes one abstract idea visible. Token asks: “What is a token
  boundary?”
- **Comparison Figure** — compares alternatives without implying computation. Chapter 0.4
  Tokenization is the reference classification, but is not redesigned in this benchmark pass.
- **Process Diagram** — shows ordered data or computation flow. Language Model uses this type.
- **Architecture / Process Diagram** — shows major system stages and their direction. GPT asks:
  “What are the major stages from context to next token?”
- **Data Visualization** — renders actual numerical evidence. Score Matrix remains the current
  R3F example and keeps its accessible HTML table.

### Visual primitives and semantic color

- Input text is plain text or a strip; a Token is a segment chip; a Sequence is an ordered strip.
- A Vector uses bars or a strip, a Matrix uses a grid, and a Tensor uses an explicit structured
  data shape.
- An Operation may use a compact box. A Container uses an outlined group. Prediction uses a
  distinct output node.
- `--figure-input`, `--figure-representation`, `--figure-operation`, `--figure-output`, and
  `--figure-highlight` encode roles, not decoration.
- Any semantic category uses at least two of color, label, and shape. Color alone never carries
  meaning.

### Connector and typography grammar

- Solid arrows mean actual data or computation flow.
- Dashed arrows mean iteration, reuse, or context update.
- Comparison and grouping use no arrow. Brackets mark boundaries or membership.
- Figure titles stay below article-heading weight. Node titles use medium weight. Formula, shape,
  tensor, and ID labels use mono or KaTeX. Captions stay muted and concise.
- Long explanation prose does not enter the SVG.

### Caption, Fit, and detail hierarchy

- A caption sits outside transformed pan/zoom geometry and states the Figure conclusion in one
  sentence.
- Default Fit is the complete Figure at 100%. At 1440×900, the whole structure, main node titles,
  arrow direction, and grouped Block label must remain readable without zoom.
- Zoom supports formula and detail inspection; it is never required to understand the root
  structure.
- GPT root owns the major path only. Transformer Block and Self-Attention detail remain in their
  existing drill-down views.

## Responsive behavior

- Desktop, tablet, and mobile share one content-first Learn model. The page owns scrolling;
  Diagram and Guide never become independent scroll panes.
- The article shell may reach 72rem. Prose stays within 52rem; `wide` and
  `full` define 64rem and 72rem maximum available Figure space. Registry
  preferred widths may keep a graphic substantially narrower.
- Lab uses one centered instrument column with a maximum inline size of 72rem.
- `FocusedViewerOverlay` uses one application-level `OverlayHost`. Desktop surfaces occupy about
  90vw by 86dvh; mobile uses an almost full-screen surface with the same local controls.
- The backdrop is warm and translucent, the surface is solid with a thin border and restrained
  shadow, and only one primary viewer can exist at a time.
- ThreeUI commit `326580429881c2abe7893bee53c62cbb31b6ee49` informs compact local controls,
  isolated renderer surfaces, ResizeObserver cleanup, visibility-aware rendering, and disposal.
  Its package, shaders, fonts, showcase chrome, and decorative scenes are not copied.
- Korean copy, formulas, and status detail may not clip at any supported breakpoint.
- Concept and comparison Figures reflow or switch to a labeled semantic mobile
  composition before horizontal scrolling is considered.
- Token uses a 3+2 mobile reflow. GPT Learn uses a readable nine-stage vertical
  composition instead of shrinking the desktop SVG.

No breakpoint changes model state or Worker ownership.

## Hybrid visualization

- Semantic SVG/DOM/KaTeX explains architecture, operation order, labels, connectors, curriculum,
  and formulas.
- Three.js and React Three Fiber render only validated numerical tensors. They never replace
  Course Home, GPT, Block, Self-Attention, or curriculum architecture diagrams.
- Lab Architecture inspection is wrapped by the generic `DiagramViewport`.
  Learn static Figures render directly in the article.
- In Lab, Fit contains the complete SVG on both axes and is the semantic `100%`
  baseline even when its internal physical scale is smaller than one. Compact
  translucent zoom-out, zoom-in, and Fit controls overlay the canvas corner.
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
- Lab focused viewers are ephemeral state and do not add history entries.
- Buttons and inputs use native semantics; Worker lifecycle uses `status` and `alert` roles.
- Selected state and drill-down capability have non-color cues.
- Math exposes MathML plus an accessible label.
- Reduced-motion preferences disable nonessential transitions.
- Learn focus order follows global navigation, compact Chapter navigation,
  article content, and ordinary Chapter links.
- Lab focus order follows Prompt, generation, output/replay, then inspection actions.
- Opening a focused viewer moves focus to Close, traps Tab, makes the application inert, locks
  page scroll, and restores the exact trigger on Close or Escape.
- Learn Figure detail uses Chapter hash navigation; it has no modal return
  state.
- Chapter identity is `trackId + chapterId`. Entering a different Chapter
  resets document scroll to top with `behavior: "auto"` before the existing
  heading/section focus handoff.
- Browser Back/Forward uses the same Chapter-top policy. Chapter pages own
  manual browser scroll restoration while mounted.
- ToC disclosure, inline Figures, architecture state, and other same-Chapter
  interactions do not reset document scroll. Lab overlay open/close preserves
  its independent scroll-lock and exact restoration contract.
- Lab Diagram viewers support Fit, zoom, pan, Ctrl+Wheel, and `+`, `-`, `F`, or
  `0` keyboard controls.

## Runtime evidence

React renders only validated model metadata and typed Worker responses. Unknown payloads fail
closed. Missing traces display pending/unknown values rather than inferred tensors or dimensions.
Generation replay selects stored Worker evidence without resampling.
