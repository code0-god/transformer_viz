# ADR 0012: Inline Learning Figures

Status: Accepted

Date: 2026-08-28

## Context

ADR 0011 removed permanent split panes but still required a Learn reader to
open and close a focused viewer for educational diagrams. That interaction
interrupted reading, made required Figures appear optional, and turned mobile
learning into page → full-screen page → page navigation.

Lab has a different job. A reader runs a model, observes a result, and
temporarily inspects architecture or trace data before continuing the
experiment. Overlay presentation remains appropriate there.

## Decision

Learn is `Article + Inline Figure`.

- `GuideBlock.kind = "figure"` stores `figureId`, width variant, caption, and
  optional accessible summary in content order.
- A track-owned `LearningFigureRegistry` resolves model-specific renderers and
  their canonical preferred display widths.
- `LearningFigure` emits semantic `<figure>` and `<figcaption>` markup.
- Width variants are `prose`, `wide`, and `full`; they define maximum available
  presentation space, not mandatory stretch width. The graphic uses the
  smaller of available and registry preferred width.
- Learn Figure renderers are static. They do not own modal state, scroll
  locking, Fit, zoom, pan, WebGL, or runtime inspection.
- GPT Root uses shared geometry with a static Learn presentation and a normal
  Chapter link to Transformer Block.
- Learn has no implementation-note block. Model-specific facts needed for a
  concept use ordinary article prose; developer details stay in docs or Lab.

Lab is `Experiment + Floating Inspection Overlay`.

- Overlay requests are Lab-only at the type boundary.
- OverlayHost retains focus trapping, Escape/backdrop close, scroll locking,
  trigger focus restoration, and responsive full-screen mobile behavior.
- DiagramViewport retains Fit, zoom, and pan for Architecture inspection.
- Score Matrix retains lazy R3F loading, WebGL fallback, context-loss recovery,
  exact table fallback, and runtime provenance.

## Consequences

- Educational Figures load with only the active Chapter.
- Learn does not request the Three/R3F Score Matrix chunk.
- Figure placement and captions are validated as content contracts.
- Preferred-width metadata prevents simple concepts from stretching to a
  comparison or architecture ceiling while preserving responsive shrink.
- Part 0 and GPT establish the migration pattern for later editorial work.
- Transformer Block and Self-Attention Figure decomposition remains separate
  follow-up work; overlay behavior is not reintroduced into Learn.

## Supersedes

This record supersedes ADR 0011 only where ADR 0011 made focused viewers the
canonical presentation for Learn diagrams. ADR 0011's article-first shell and
shared Lab viewer infrastructure remain valid.
