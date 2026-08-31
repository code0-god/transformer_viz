# Golden Chapter 0.1 — 자연어 처리란?

## Status

- Scope: Chapter 0.1 only
- Implementation: complete
- Automated verification: pass
- Independent visual critique: pass with no blocking findings
- User visual approval: pending
- Expansion to Chapter 0.2 or later: prohibited before approval

## Learning goal

The Chapter leaves a beginner with three ideas:

1. People use language to share meaning.
2. Computers and models calculate with numerical representations.
3. Natural language processing connects human language to computable
   representations and connects the result back to a human-usable form.

The final question is not another NLP definition. It is the entrance to
Chapter 0.2:

> 그렇다면 이 문장을 계산 가능한 작은 단위로 어떻게 나눌까요?

## Deliberate exclusions

Chapter 0.1 does not teach Token ID, Vocabulary, Embedding, Position
Embedding, Hidden State, Transformer Block, Self-Attention, Q/K/V, Softmax,
Logit, Sampling, or Autoregressive Generation.

The Token Preview is a conceptual boundary cue. It is not a tokenizer output
and is never drawn as a fifth inference stage after Result.

## Hero object

One sentence remains the protagonist:

> 오늘 영화 정말 재미있었어요.

The sentence is rendered once as DOM text. The same DOM node survives every
state. Numerical cells are also mounted once and transformed in place.

## Narrative beats

### Language

Prose establishes that people can read a sentence and understand its meaning.
Only the sentence is visually dominant.

### Numeric

Conceptual cells appear directly beneath the same sentence. They contain no
fabricated values. Their geometry communicates that a numerical
representation contains many related values.

### Transform

The same cells shift emphasis and relation. Thin SVG curves make changed
relationships visible. No black model box or architecture preview appears.

### Result

The sentence and cells remain visible while one semantic result appears:
`이 문장의 분위기 — 긍정`. A quiet secondary range names classification,
question answering, translation, and generation so NLP is not mistaken for
sentiment classification alone.

### Token Preview

Emphasis returns to the same sentence. Conceptual boundaries appear between
phrases with the explicit note that real boundaries depend on the tokenizer.
Editorial Next navigation then opens Chapter 0.2.

## Visual primitives

### TextPhrase

Readable Korean DOM text. It carries the learner's original object and never
becomes a generic chip.

### VectorCells

Small aligned cells with no fake values. Groups correspond spatially to parts
of the sentence.

### TransformationLayer

The existing cells change position, emphasis, and relation. Thin SVG curves
support the transformation without becoming a pipeline arrow diagram.

### SemanticResult

Human-readable task output and a compact task range. Meaning comes from real
copy, not a generic output rectangle.

## Object permanence contract

Every state follows:

```text
APPEAR
TRANSFORM
EMPHASIZE
REUSE
```

State changes must add or transform existing objects. Whole-scene fade-out,
new Figure replacement, generic node pipelines, and remount-driven continuity
are failures.

## Renderer ownership

- DOM owns the sentence, state label, semantic result, task range, boundary
  note, and accessible summaries.
- SVG owns only the thin transformation relationships.
- R3F is not used. Chapter 0.1 contains no trace-backed numerical data whose
  meaning benefits from a Canvas.
- ThreeUI remains the shell, navigation, focus, and global control language.

Removing R3F from this Chapter is deliberate. Renderer purity is less
important than object continuity, semantic HTML, zero idle work, and a
seamless reading plane.

## Motion

- Typical transitions: 520–720ms.
- Only opacity, transform, filter, and SVG stroke appearance change.
- No autoplay.
- No idle animation.
- No scroll lock, snap, wheel interception, or product `scrollTo`.
- Normal document scroll selects the nearest prose beat.
- Reduced motion snaps to a complete state in at most 1ms of computed
  transition duration.

## Layout

The page uses normal document scrolling and a bounded `sticky-aside`
relationship:

- first beat enters at article measure;
- one visual remains visible while later prose beats pass through the active
  reading zone;
- no internal scroll container exists;
- Figure, caption, and keyboard stage navigation remain semantic but visual
  chrome stays hidden;
- sticky behavior ends with the narrative section.

## Mobile

- The same DOM source order remains.
- Visual height is 288px at 320px and about 304px at 390px.
- Numerical cells reduce from six to four visible cells per phrase group
  rather than shrinking into illegibility.
- No horizontal document or local narrative overflow is allowed.
- The Header remains clear of the sticky visual.
- The Chapter footer remains normal editorial navigation.

## Accessibility

- Prose alone explains the complete concept.
- The visual exposes one `role="img"` with a state-specific description.
- A semantic five-item fallback remains mounted with
  `aria-current="step"`.
- Native buttons preserve focus, Enter, Space, click, and touch stage access;
  the rail appears only while keyboard focus is inside it.
- Color is paired with position, relation, copy, and boundary lines.
- Reduced motion preserves every complete state.
- Canvas contains no unique information because Chapter 0.1 has no Canvas.

## Why no Figure box

The Figure element remains for document semantics. It does not define the
visual surface.

The Chapter intentionally has no visible Figure title, description, caption
divider, border, radius, shadow, tinted Canvas, step rail, or replay CTA.
Article background and visual background are the same surface.

## Chapter 0.1 to 0.2 handoff

The final state reuses the hero sentence and reveals only conceptual
boundaries. The note prevents false tokenizer claims. Existing editorial Next
navigation supplies the only CTA:

```text
Token이란? →
```

Chapter 0.2 implementation and content remain unchanged in this task.

## Evidence

Fresh evidence lives at:

```text
.omo/evidence/golden-chapter-01/browser/
```

Required files:

```text
01-language-state.png
02-numeric-state.png
03-transform-state.png
04-result-state.png
05-token-preview.png
06-full-chapter-desktop.png
07-full-chapter-mobile.png
08-before-after.png
09-language-numeric-mid.png
10-numeric-transform-mid.png
11-keyboard-focus.png
12-reduced-motion-token-preview.png
mobile-01-language-state.png
mobile-02-numeric-state.png
mobile-03-transform-state.png
mobile-04-result-state.png
mobile-05-token-preview.png
evidence.json
before-after-diff.json
```

Root and `/transformer_viz/` contracts use separate production builds and
fresh Chrome sessions.

## Scope freeze

Production content, scenes, and diagrams for Chapter 0.2 and every later
Chapter remain unchanged. No broader migration begins until Chapter 0.1
receives explicit user visual approval.
