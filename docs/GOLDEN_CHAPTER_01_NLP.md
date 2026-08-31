# Golden Chapter 0.1 — Guided Slide Narrative

## Status

- Scope: Chapter 0.1 only
- Implementation: complete
- Automated verification: pass on focused and production-browser gates
- Independent visual critique: pass, two final reviewers, blockers 0
- User visual approval: pending
- Expansion to Chapter 0.2 or later: prohibited before approval

## Learning goal

The Chapter makes one progression directly readable:

```text
사람의 언어
→ 설명용 숫자 표현
→ 계산으로 달라진 숫자 표현
→ 사람이 사용하는 결과
→ Token 경계에 대한 다음 질문
```

It does not teach Token ID, Vocabulary, Embedding, tensor shape, matrix
multiplication, Hidden State, Transformer Block, or Self-Attention.

## Why the long-scroll model was removed

The previous Golden layout kept one sticky visual beside five tall prose
beats. Object continuity was correct, but the learner still had to search a
long page for the current state. Mobile repeated the same problem as a sticky
visual followed by successive paragraphs.

The current model mounts one stable Narrative Stage and exposes one concept at
a time. Previous, Next, five dots, and scoped Arrow keys are the only state
controls. Document scrolling remains ordinary page navigation and never
changes the slide.

## Stable stage architecture

```text
GoldenNarrativeDeck
├─ one active LEFT explanation
├─ one persistent RIGHT LearningFigure
│  └─ NlpPipelineDiagram
└─ compact Previous / progress / Next controls
```

The component is Chapter-specific. Shared Inline, Split, and Sticky
`VisualNarrative` consumers retain their existing observer behavior.

## Slide sequence

### 1. 사람이 읽는 언어

The canonical source object is one persistent Korean sentence:

```text
오늘 영화 정말 재미있었어요.
```

Typography is the visual object. No quote box, card, chip, or generic
rectangle surrounds it.

### 2. 계산 가능한 표현

The same sentence remains visible while one horizontal six-slot number
sequence appears:

```text
0.24  -0.71  0.18  0.63  -0.09  …
```

Visible copy states:

```text
설명을 위한 예시 · 실제 모델 값 아님
```

The values mix signs and do not form a probability distribution.

### 3. 모델 계산

The same number-slot and value DOM nodes remain mounted. Before values
crossfade to:

```text
0.51  -0.12  0.84  0.27  0.36  …
```

`계산 전` and `계산 후` make the semantic change explicit. No model box,
second sequence, two-dimensional grid, or matrix appears.

### 4. 결과

The transformed sequence becomes quiet but remains present. One conceptual
result becomes dominant:

```text
개념 예시
이 문장의 분위기  긍정
분류 · 질문 답변 · 번역 · 글 생성
```

This is an explanatory semantic example, not a runtime inference claim.

### 5. 다음 질문

The source sentence returns to primary emphasis and conceptual boundaries
appear. Visible copy states that actual boundaries depend on the tokenizer.
A quiet slide-scoped `Token이란? →` link opens Chapter 0.2.

## Object permanence

One `NlpPipelineDiagram` remains mounted through all five slides. Browser
contracts mark and compare strict DOM identity for:

- deck root;
- visual root;
- sentence;
- numeric strip;
- each numeric slot and before/after value node.

Only the LEFT prose node is discrete. RIGHT objects change through CSS
opacity, transform, filter, and value crossfade.

## Layout geometry

Desktop uses one CONTENT-to-WIDE asymmetric span:

- LEFT_START = Chapter CONTENT_START;
- RIGHT_END = Chapter WIDE_END;
- LEFT / RIGHT = 38 / 62 after subtracting the gap;
- gap = 56–72px;
- controls remain below the stage and do not change its geometry.

Final production measurements:

| Viewport | Stage | LEFT | Gap | RIGHT |
| ---: | ---: | ---: | ---: | ---: |
| 1440×900 | 992×518.39px | 349.59px | 72px | 570.41px |
| 1366×768 | 992×491.75px | 351px | 68.30px | 572.70px |
| 1024×768 | 894.91×480px | 318.78px | 56px | 520.12px |

Across fifteen desktop state records, every stage, column, visual, and control
coordinate drift is 0px.

## Mobile and tablet

At 768px and below, every slide keeps:

```text
active explanation
persistent visual
compact controls
```

No other explanation consumes block height. A 154px responsive copy slot
accommodates the longest Korean paragraph without clipping or stage jump.

| Viewport | Stage | Visual width |
| ---: | ---: | ---: |
| 768×1024 | 698.62×416.72px | 698.62px |
| 390×844 | 358×411.59px | 358px |
| 320×568 | 288×411.59px | 288px |

Mobile and tablet document overflow, local overflow, nested scrollbars, and
state geometry drift are all 0.

## Interaction

- Previous and Next use native buttons with at least 44×44px targets.
- Five compact dots expose `N단계: label` and one `aria-current="step"`.
- ArrowLeft and ArrowRight work only while focus is inside the deck.
- Input, textarea, select, and contenteditable targets are not intercepted.
- Boundaries do not wrap.
- Wheel input remains uncanceled and does not change slides.
- Slide changes do not write browser history.
- Browser Back remounts Chapter 0.1 on Slide 1; Forward restores Chapter 0.2.
- No autoplay, timer, scroll observer, scroll lock, or swipe dependency exists.

## Motion and reduced motion

- Prose transition: 360ms.
- Object transitions: 320–640ms.
- Numeric values crossfade in the same slots.
- No whole-stage replacement or lateral deck animation occurs.
- Rest, midpoint, and settled frames are captured for 1→2, 2→3, and 4→5.
- Reduced motion yields every complete state with at most 1ms relevant
  duration and zero running animations.

## Renderer and performance boundary

- DOM owns all visible and accessible learning content.
- R3F, Canvas, SceneFigure, idle RAF, and replay controls remain absent.
- The persistent visual creates no IntersectionObserver.
- No dependency, Worker, model, tokenizer, or runtime protocol changed.

## Accessibility

- One `role="img"` uses the required complete visual description.
- Five semantic fallback summaries stay mounted; one is current.
- Native controls retain focus, Enter, Space, click, and touch behavior.
- Current state is conveyed by text, position, `aria-current`, and visual
  emphasis rather than color alone.
- Korean text uses phrase-safe wrapping and keeps punctuation attached.
- The final Chapter handoff restores destination H1 focus.

## Evidence

Fresh root evidence:

```text
.omo/evidence/golden-slide-rework/browser/
```

Fresh project-subpath evidence:

```text
.omo/evidence/golden-slide-rework/subpath-browser/
```

Coverage:

- 30 viewport/state screenshots: six required viewports × five slides;
- exact canonical files `01-slide-language.png` through
  `11-slide-token-390.png`;
- `06-full-chapter.png`;
- nine transition frames;
- `contact-6x5.png`, `contact-transitions.png`, and
  `before-after-language.png`;
- root and `/transformer_viz/` `evidence.json`.

Both deployment bases contain thirty geometry records, zero state drift, zero
boundary delta, zero overflow, and zero runtime/network/console errors.

## Scope freeze

Chapter 0.2 and every later Chapter remain unchanged. Part 1, Part 2, GPT,
Transformer Block, Self-Attention, Lab, Score Matrix, ThreeUI shell, Worker,
model assets, tokenizer assets, root hosting, and project-subpath hosting keep
their established contracts.

No broader migration begins until explicit user visual approval.
