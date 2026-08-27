# ADR 0011: Content-first pages with focused viewer overlays

- Status: Accepted
- Date: 2026-08-27
- Supersedes: ADR 0009's permanent desktop Diagram/Guide split

## Context

The learning workspace currently reserves approximately 48% of every desktop
chapter for a diagram and 52% for its guide. The curriculum shell repeats this
contract and gives the guide its own scroll owner. Lab also keeps architecture
visible below the generation flow.

This arrangement creates structural problems:

- long Korean explanations are compressed into an inspector-width column;
- diagrams occupy space even while the learner does not need them;
- large GPT and Self-Attention diagrams become too small at Fit;
- nested page, diagram, and guide scrolling obscures the active reading context;
- desktop feels like a dashboard while mobile uses a different vertical model;
- persistent architecture competes with prompt, generation, replay, and output
  in Lab;
- adding more SVG and R3F views would multiply permanent panes and tabs.

The issue is not the 48:52 ratio. The issue is the assumption that a large
visual must always be present.

## Decision

Learn becomes an explanation-first reading surface:

1. chapter header;
2. centered book-like article;
3. small inline examples where they remain legible;
4. explicit concept-specific actions that open large visuals only when needed.

Lab becomes an experiment-first instrument:

1. prompt and generation controls;
2. continuation, replay, and current-run information;
3. explicit inspection actions for architecture and trace views.

One application-level `OverlayHost` renders one primary
`FocusedViewerOverlay`. Learn and Lab share this infrastructure and pass typed
source context into registered diagram, architecture, or visualization
content. Features do not implement independent modal shells and overlays do not
stack.

The focused viewer:

- uses a responsive 80-92vw by 78-90vh desktop surface;
- becomes nearly full-screen on mobile;
- keeps a warm neutral backdrop that preserves page context;
- supports explicit Close, Escape, focus trapping, focus restoration, and body
  scroll locking;
- returns to the original page and scroll position on close;
- uses compact local controls and restrained motion;
- keeps descriptions and accessible fallbacks outside transformed visual
  geometry.

`DiagramViewport` remains responsible for SVG Fit, zoom, pan, Ctrl+Wheel,
resize, and node reveal. `ThreeVisualizationSurface` remains responsible for
lazy rendering, WebGL isolation, context-loss handling, and the exact HTML
fallback. The Score Matrix R3F chunk loads only after its visualization viewer
opens and unmounts when the viewer closes.

ThreeUI commit `326580429881c2abe7893bee53c62cbb31b6ee49` remains a source
reference for compact semantic toolbars, isolated renderer surfaces,
ResizeObserver cleanup, visibility-aware rendering, reduced-motion behavior,
and explicit WebGL disposal. Its package, shaders, fonts, developer-showcase
chrome, and perpetual renderer loops are not copied.

## History and URL policy

Focused viewers are ephemeral inspection state in this milestone. Chapter and
Lab routes remain the shareable URL boundary. Opening a viewer does not add a
history entry; browser Back continues to mean previous chapter or page.

Deep links such as `?overlay=score-matrix&layer=0&head=2` remain deferred until
sharing a specific inspection proves necessary. This avoids coupling transient
focus, selection, and WebGL lifecycle state to the existing hash router.

## Accessibility

The focused viewer uses `role="dialog"`, `aria-modal="true"`, and an accessible
name. Opening moves focus into the viewer and makes the underlying application
inert. Closing restores focus to the exact trigger. Escape closes the viewer;
backdrop pointer release closes only when both press and release occur on the
backdrop, preventing a visual drag from dismissing it.

SVG semantics, HTML diagram fallbacks, the exact Score Matrix table, and WebGL
failure states remain available inside the viewer.

## Consequences

- Learn and Lab share one mental model across desktop, tablet, and mobile.
- Reading and experimentation receive full-width primary surfaces.
- Large visuals gain enough room for useful Fit and local inspection.
- Existing inference, protocol, numerical parity, routes, and visualization
  foundations remain unchanged.
- Permanent split CSS, split scroll ownership, and persistent
  explanation/visualization tabs are removed.
- Overlay URL deep linking, new tensor visualizations, QKV explorers, animated
  attention stages, additional models, and content-wide curriculum rewriting
  remain outside this milestone.
