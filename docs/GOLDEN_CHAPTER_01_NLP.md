# Golden Chapter 0.1 — 자연어 처리란?

## Status

- Scope: Chapter 0.1 only
- Refinement implementation: complete
- Automated verification: pass
- Independent visual critique: pass with no blocking findings on the final
  25-image evidence set
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

One conceptual numerical field appears directly beneath the same sentence.
It contains no fabricated values. Desktop shows two rows of eight cells;
narrow layouts reveal two rows of six from the same sixteen mounted DOM
cells. No phrase- or token-sized groups exist.

### Transform

The same field keeps identical bounds, cell dimensions, row count, column
count, and anchor. Only cell emphasis and thin SVG relationship curves
change. No black model box or architecture preview appears.

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

One aligned field of small cells with no fake values. It communicates only
that several numbers form one calculable representation; it does not claim a
token mapping, matrix type, tensor shape, or embedding.

### TransformationLayer

The existing field keeps its geometry while cell emphasis and relation
change. Thin SVG curves support the transformation without becoming a
pipeline arrow diagram.

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
- Numeric-to-Transform motion never changes field or cell geometry.
- No autoplay.
- No idle animation.
- No scroll lock, snap, wheel interception, or product `scrollTo`.
- Normal document scroll selects the nearest prose beat.
- Reduced motion snaps to a complete state in at most 1ms of computed
  transition duration.

## Layout

The page uses normal document scrolling and one bounded `sticky-aside`
relationship:

- the narrative WIDE grid is capped at 1152px;
- every beat uses the same 38/62 explanation-to-visual columns;
- the column gap scales from 56px to 72px;
- all five explanation and visual grid lines remain within 1px;
- the first beat uses the same grid instead of spanning both columns;
- one visual remains visible while prose beats pass through the active
  reading zone;
- no accent divider or beat-local grid exists;
- no internal scroll container exists;
- Figure, caption, and keyboard stage navigation remain semantic but visual
  chrome stays hidden;
- sticky behavior ends with the narrative section.

## Mobile

- The same DOM source order remains.
- Visual height is 232px at 320px and about 281px at 390px.
- The same sixteen cells remain mounted; one 2×6 field is visible on narrow
  layouts.
- Every non-Language active paragraph begins 15–40px below the visual.
- At 320×568, complete active prose retains at least 32px below it.
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
.omo/evidence/golden-chapter-01-refinement/browser/
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
09-language-numeric-mid.png
10-numeric-transform-mid.png
11-keyboard-focus.png
12-reduced-motion-token-preview.png
13-before-after-numeric.png
14-before-after-transform.png
15-before-after-result.png
desktop-1024-numeric.png
desktop-1366-numeric.png
mobile-01-language-state.png
mobile-02-numeric-state.png
mobile-03-transform-state.png
mobile-04-result-state.png
mobile-05-token-preview.png
mobile-320-numeric.png
mobile-320-transform.png
mobile-320-result.png
evidence.json
```

Root and `/transformer_viz/` contracts use separate production builds and
fresh Chrome sessions.

Final geometry evidence:

- 1024px: 342.69px explanation, 56px gap, 559.11px visual;
- 1366px: 411.80px explanation, 68.30px gap, 671.91px visual;
- 1440px: 410.39px explanation, 72px gap, 669.61px visual;
- Numeric and Transform field: 508.89×78.78px;
- each desktop cell: 56.61×35.38px;
- grid drift across fifteen desktop records: 0px.

## Scope freeze

Production content, scenes, and diagrams for Chapter 0.2 and every later
Chapter remain unchanged. No broader migration begins until Chapter 0.1
receives explicit user visual approval.
