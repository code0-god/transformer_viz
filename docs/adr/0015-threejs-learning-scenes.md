# ADR 0015: Visible-only Three.js learning scenes

- Status: Accepted
- Date: 2026-08-29
- Supersedes: ADR 0012 static-only Learn renderer rule
- Extends: ADR 0010 R3F renderer boundary

## Context

ADR 0012 correctly made Learn `Article + Inline Figure`, removed modal
inspection chrome, and kept Figure placement in curriculum content. Its rule
that every Learn renderer must be static is too restrictive for concepts whose
essential relation is spatial or temporal.

ADR 0010 correctly requires actual Worker evidence for Lab data
visualizations. Learn scenes have a different contract: they teach a symbolic
operation, label every value as illustrative, and retain equivalent semantic
content without WebGL.

## Decision

R3F is a first-class Learn Figure renderer only when depth, selection, or a
short state transition materially improves one written learning question.

The first benchmark implements exactly three Part 2 scenes:

1. Token Embedding — `LOOKUP`
2. Position Embedding — `COMPOSITION`
3. Hidden State — `EVOLUTION`

No Part 0, Part 1, GPT, Transformer Block, or Self-Attention scene is
implemented by this decision.

## Shared architecture

`LearningFigureRegistry` owns static-versus-scene metadata, preferred width,
aspect ratio, loading strategy, reduced-motion policy, and fallback identity.

`SceneFigure` owns:

- two `IntersectionObserver` boundaries: nearby code preload at a 480px root
  margin and active rendering only at the real viewport;
- renderer unmount while offscreen;
- WebGL capability detection;
- lazy and render error isolation;
- context-loss fallback and restoration;
- desktop/mobile viewport mode;
- reduced-motion propagation;
- semantic title, description, controls, annotations, and fallback;
- mount, Canvas, context, frame, observer, and visibility instrumentation.

`LearningSceneCanvas` owns one scene-local R3F Canvas, controlled camera,
restrained lighting, no shadows or postprocessing, DPR 1–1.5, and
`frameloop="demand"`.

## Rendering policy

- scene-per-Canvas; no shared-Canvas abstraction in this phase;
- no Drei or animation dependency;
- no free orbit in benchmark scenes;
- no scroll-linked computation;
- no permanent motion;
- invalidate only during a short state transition;
- settled scene frame count remains unchanged during browser RAF sampling;
- viewport changes remount the Canvas at its correct dimensions;
- Korean and long labels remain DOM text, never textures;
- R3F geometry carries no unique learning information.

## Data and accessibility policy

Learn benchmark values are illustrative geometry, not fake model weights.
Visible DOM copy states that fact. Every scene retains a semantic SVG/DOM
fallback, native buttons, `aria-pressed` state, 44px targets, keyboard access,
and a non-color selected state.

WebGL unavailable, lazy-load failure, render failure, context loss, or reduced
motion must not block the learning point.

## Consequences

Three and Fiber become a shared lazy chunk used by Learn scenes and Lab Score
Matrix. Home does not request it. Scene-specific chunks remain small and lazy.
Only a visible scene owns a context, and offscreen cleanup returns active
Canvas and context counts to zero.

ADR 0012 remains authoritative for inline placement, article ownership,
captions, width variants, and the Learn/Lab split. ADR 0010 remains
authoritative for trace-backed Lab data and exact HTML parity.
