# Learn Visual Narrative Reading Model

## Status

- Priority: 0
- Implementation: COMPLETE for three benchmark Chapters
- Automated gates: PASS
- Independent visual critique: strengths and residual issues recorded
- User visual approval: PENDING
- Expansion to the remaining eleven Chapters: prohibited until approval

## Why Figure-first reading was rejected

The previous canonical rhythm was:

```text
Article
→ titled and described Figure
→ bordered scene plane
→ controls and replay
→ separated caption
→ Article
```

Even when the scene was educationally correct, that sequence made reading stop
at a separate visualization widget. The learner had to leave the explanation,
operate a component, read its caption, and return to the article.

The new benchmark direction is:

```text
Prose beat
→ the same visual changes
→ the next prose beat explains that change
→ the same visual reinforces the next relation
```

`figure` and `figcaption` remain available as semantic HTML. They no longer
define visible outer chrome.

## Architecture

```text
LearningGuide
└─ VisualNarrative
   ├─ Narrative beats
   ├─ semantic LearningFigure
   │  └─ SceneFigure lifecycle primitive
   └─ compact direct-access navigation
```

`SceneFigure` still owns lazy loading, visibility, WebGL capability and
failure isolation, context lifecycle, reduced motion, semantic fallback, and
demand rendering. `VisualNarrative` owns only reading composition and stage
selection.

No general scroll-animation framework or visual DSL was added.

## Benchmark-scoped primitives

### VisualNarrative

One content block combines:

- layout type;
- prose beats;
- a semantic Figure;
- the stage associated with each beat;
- compact native buttons for direct access.

### Narrative beat

A beat is normal article prose. The active beat receives only a two-pixel
marker and reduced opacity on inactive siblings. Beats are not cards.

### Narrative stage context

The composition shares one active stage with its existing scene wrapper.
Scenes retain standalone controls when rendered outside a narrative. Inside a
narrative they remove duplicate rails and replay actions.

## Canonical layout types

### Inline narrative

Used by Tokenization.

```text
prose
sentence strip / token split
prose conclusion
```

The stage uses the CONTENT reading plane, no visible Canvas boundary, and a
content-scaled height.

### Text + visual split

Used by Token Embedding.

```text
prose beats | embedding table and extracted row
```

Desktop uses the WIDE plane. The visual column remains wide enough to use the
desktop scene composition. At 768px and below, source order becomes first
beat, visual, remaining beats.

### Bounded sticky narrative

Used by Self-Attention.

```text
prose beats | one persistent spatial stage
```

Sticky positioning is CSS-only and bounded by the narrative section. It does
not cover the Header or overlap following content. At 768px and below it
becomes normal flow.

## Interaction policy

- normal page scrolling remains primary;
- no scroll lock, snapping, wheel interception, page pinning, or forced
  `scrollTo` exists in product code;
- a passive, requestAnimationFrame-throttled scroll listener selects the beat
  nearest a stable 44% viewport line;
- IntersectionObserver remains the entry/visibility signal;
- the first stage remains deterministic until the first scroll;
- compact native buttons provide click, focus, Enter, Space, and touch access;
- manual selection never depends on a particular pixel scroll position.

## Tokenization benchmark

Pattern: Inline.

```text
ONE STRIP
→ BOUNDARIES
→ SEPARATED CHIPS
```

The actual sentence is the primary label. Narrative mode removes the local
depth plane, thins the geometry, keeps word-like and current-byte truth, and
removes the replay rail. The current tokenizer data source is unchanged.

## Token Embedding benchmark

Pattern: Split.

```text
ID
→ row lookup
→ row lift
→ standalone vector
```

The left column contains the existing explanation. The right column keeps the
table, selected row, and vector visible together. Desktop width is reserved
for the horizontal scene; mobile deliberately uses the vertical composition.

## Self-Attention benchmark

Pattern: Bounded sticky.

```text
Overview
→ Q/K/V
→ Scores
→ Causal Mask
→ Softmax
→ Weighted V and output
```

One scene and one Canvas persist through the six prose beats. Scroll changes
only state. The compact stage navigation is an alternative, not the primary
reading model.

## Visual policy

Narratives share the article background and coordinate system:

- no outer card;
- no large radius or shadow;
- no tinted scene panel;
- transparent Canvas;
- no visible Figure heading or subtitle;
- visually hidden but present figcaption;
- labels remain adjacent to geometry;
- ThreeUI appears only in selectors, focus, and compact stage controls.

## Mobile policy

- split and sticky layouts collapse to one column;
- DOM order is first beat, visual, remaining beats;
- sticky is disabled;
- Canvas uses the same stable geometry box across states;
- targets remain at least 44px;
- no horizontal overflow;
- no scene occupies most of the mobile viewport.

## Accessibility

- article heading hierarchy remains unchanged;
- the existing Architecture `aria-level` compatibility fix is untouched;
- prose order remains DOM order;
- semantic Figure and figcaption remain;
- static fallback remains inside the same prose/visual flow;
- native buttons expose all states without scroll;
- active stage uses `aria-current="step"`;
- color is never the only state cue.

## Lifecycle and performance

- existing scene-specific lazy chunks and shared R3F vendor remain;
- `frameloop="demand"` remains;
- stage changes invalidate only during bounded transitions;
- settled idle RAF is zero;
- visible narrative owns one Canvas;
- offscreen Canvas unmounts;
- narrative and scene observers disconnect on route exit;
- no dependency was added.

Two derived reference collections were memoized after the narrative context
exposed transition restarts in Tokenization and Self-Attention. Geometry and
production semantics did not change.

## Failure and reduced-motion behavior

WebGL unavailable, import failure, render failure, and context loss retain
semantic fallback. Narrative styling removes fallback card chrome so the flow
remains prose + static visual + prose.

Reduced motion keeps the same states and immediately snaps to the selected
stage.

## Scope freeze

Changed Chapters:

1. 0.2 Tokenization — Inline
2. 2.1 Token Embedding — Split
3. 5.1 Self-Attention — Bounded sticky

The remaining eleven Chapter visual structures are unchanged.

## Independent review policy

Implementation does not self-approve visual acceptance. Review must inspect:

- before and after viewport captures;
- full-Chapter captures;
- all required interaction states;
- 390px mobile states;
- text/visual dependence;
- Canvas and control prominence.

Current independent critique is recorded in the Priority-0 final report.
User visual approval remains pending.

## Post-approval roadmap only

No phase below is authorized until the three benchmarks receive user visual
approval.

1. Phase 2 — remaining Part 0
2. Phase 3 — Part 1
3. Phase 4 — remaining Part 2
4. Phase 5 — GPT and Transformer Block
