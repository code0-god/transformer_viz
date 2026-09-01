# ADR 0016: Fourteen-Chapter Learn visual experience

- Status: Accepted
- Date: 2026-08-30
- Extends: ADR 0015 visible-only Three.js learning scenes
- Preserves: ADR 0012 inline Figure and article ownership

## Context

ADR 0015 proved that scene-local, visible-only R3F Figures can teach spatial
or temporal concepts without idle rendering, inaccessible Canvas-only
content, or fake model evidence. Its three Part 2 benchmarks also exposed a
product discontinuity: Part 0 and Part 1 remained static-first while Part 2
looked like a separate prototype.

GPT, Transformer Block, and Self-Attention additionally lacked primary
Chapter visualizations even though their essential relations are pipeline,
residual, and aggregation structures.

## Decision

Learn ships as one fourteen-Chapter interactive visual textbook:

```text
Article + Interactive Visual Learning Experience
```

Every canonical Chapter owns one primary Figure. Eleven curriculum Figures
use visible-only scene metadata; GPT, Transformer Block, and Self-Attention
use architecture-scene registries. Each Chapter keeps a distinct spatial verb:

- Part 0: representation, segmentation, addressing, resegmentation;
- Part 1: fan-out, transformation, accumulation, growing loop;
- Part 2: lookup, composition, evolution;
- GPT: pipeline;
- Transformer Block: residual;
- Self-Attention: aggregation.

The shared product language is a ThreeUI-first computation atlas: cool paper,
restrained depth, semantic color roles, crisp DOM labels, compact controls,
and no decorative permanent motion.

## Runtime boundary

`SceneFigure` remains the lifecycle owner. It preloads nearby chunks, mounts
only visible scenes, unmounts offscreen scenes, propagates reduced motion,
isolates capability/import/render/context failures, and retains semantic
fallback content.

`LearningSceneCanvas` remains scene-local with:

- `frameloop="demand"`;
- DPR clamped to 1–1.5;
- no shadows or postprocessing;
- a stable document event source during asynchronous R3F setup;
- no shared-Canvas portal architecture.

Normal tests remain parallel. The one instrumentation-heavy
`SceneFigure.test.tsx` lane runs separately with file parallelism disabled
because its metrics store is shared test instrumentation, not product state.

## Semantic boundary

Learn geometry is illustrative and labeled as such. It never claims to show
model weights or runtime tensors. Lab Score Matrix remains the canonical
actual-data visualization backed by correlated Worker trace values.

Canvas owns no unique learning content. Every scene retains:

- semantic DOM/SVG fallback;
- title, description, caption, and one-sentence conclusion;
- native keyboard/touch controls with at least 44px targets;
- non-color state cues;
- meaningful reduced-motion and WebGL-unavailable states.

## Consequences

- Home does not eagerly request Learn scene or R3F chunks.
- Scene modules remain independent lazy chunks.
- Only one visible Learn scene owns a Canvas in current Chapter layouts.
- Settled and offscreen scenes add zero RAF work.
- Twenty visibility cycles return active Canvas and WebGL context counts to
  zero.
- Root and `/transformer_viz/` builds share identical behavior.
- Mobile unbroken stage labels may wrap to two readable lines without local
  or document overflow.

## Evidence

- Storyboard: `docs/LEARN_VISUAL_STORYBOARD.md`
- Desktop contact sheet:
  `.omo/evidence/learn-visual-reboot/contact-sheet/final-14-desktop.png`
- Mobile contact sheet:
  `.omo/evidence/learn-visual-reboot/contact-sheet/final-7-mobile.png`
- Lifecycle:
  `.omo/evidence/learn-visual-reboot/part2/lifecycle-v4/evidence.json`
- Determinism:
  `.omo/evidence/learn-visual-reboot/vitest-determinism/repeated-runs.json`

ADR 0015 remains the foundation decision. This ADR supersedes only its
three-benchmark implementation limit.

## Heading hierarchy compatibility debt

Architecture route Guides retain their existing native `h3`/`h4` tags and
visual CSS. Changing them to the ideal native `h2`/`h3` hierarchy currently
triggers a jsdom 30 CSSOM failure in otherwise unrelated semantic-role tests.

Until that test-environment blocker is removed, only affected route headings
expose `aria-level="2"` and `aria-level="3"`. Chrome's accessibility tree is
sequential, Lighthouse heading order passes, no redundant `role` is added,
and computed styles remain byte-for-byte visually equivalent. Migrating to
native `h2`/`h3` remains explicit technical debt.
