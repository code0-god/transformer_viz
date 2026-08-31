# Golden Chapter 0.1 — Guided Slide Narrative

## Status

- Scope: Chapter 0.1 only
- Implementation: complete
- Automated verification: pass on focused and production-browser gates
- Independent visual critique: pass, two fresh final reviewers, blockers 0
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

#### Question

사람에게 언어는 어떻게 보이는가?

#### Core copy

사람은 문장을 읽고 그 뜻과 분위기를 자연스럽게 받아들인다. 예시 문장에서
긍정적인 느낌을 쉽게 알아차릴 수 있다.

#### Main visual

The canonical source object is one persistent Korean sentence:

```text
오늘 영화 정말 재미있었어요.
```

Typography is the visual object. No quote box, card, chip, or generic
rectangle surrounds it. `재미있었어요` receives one restrained underline and
`긍정적인 느낌` remains a quiet semantic cue rather than a result badge.

#### Transition

The sentence starts fully legible and remains mounted when later objects enter.

#### Misconception avoided

The quiet `긍정적인 느낌` cue records human interpretation. It is neither a
model output nor classification UI.

#### Takeaway

사람은 문장에서 뜻과 분위기를 직접 읽는다.

### 2. 계산 가능한 표현

#### Question

컴퓨터가 계산하려면 언어를 무엇으로 바꿔야 하는가?

#### Core copy

컴퓨터는 `재미있다`라는 뜻 자체를 계산하지 않는다. 덧셈과 곱셈을 하려면
문장을 숫자로 이루어진 표현으로 바꿔야 한다.

#### Main visual

The same sentence remains visible. A shared `숫자로 표현` cue and downward
arrow lead to one horizontal six-slot number sequence:

```text
0.24  -0.71  0.18  0.63  -0.09  …
```

Visible copy states:

```text
설명을 위한 예시 · 실제 모델 값 아님
```

The values mix signs and do not form a probability distribution.

#### Transition

The sentence de-emphasizes while the persistent strip enters below it. No
sentence phrase is aligned to a numeric slot.

#### Misconception avoided

The displayed numbers are explanatory values, not current model values. The
single horizontal sequence is not a matrix or grid.

#### Takeaway

컴퓨터가 계산하려면 언어가 숫자로 이루어진 표현이어야 한다.

### 3. 모델 계산

#### Question

모델의 계산은 이 숫자 표현에 무엇을 하는가?

#### Core copy

모델 안에서는 이 숫자들을 이용한 계산이 여러 번 이어진다. 계산을 거칠
때마다 값이 달라지고, 바뀐 값은 다음 계산의 입력이 된다.

#### Main visual

The same number-strip and slot DOM nodes remain mounted. One shared
`여러 계산` cue spans the strip. Five value slots show direct correspondence:

```text
 0.24    -0.71     0.18     0.63     -0.09
   ↓        ↓        ↓        ↓        ↓
 0.51    -0.12     0.84     0.27      0.36
```

The ellipsis remains one stable continuation marker and does not pretend to be
a calculated value. No model box, second sequence, two-dimensional grid, or
matrix appears.

#### Transition

Before values move upward and soften; arrows appear; after values enter below
inside the same fixed slots. Slot and strip geometry never move.

#### Misconception avoided

Each vertical arrow marks before/after correspondence inside one persistent
slot. It does not claim that the model computes each scalar independently.

#### Takeaway

모델의 계산은 숫자 표현의 값을 바꾼다.

### 4. 결과

#### Question

계산된 숫자 표현은 어떻게 사람이 쓰는 결과가 되는가?

#### Core copy

계산된 숫자 표현을 문제의 목적에 맞는 결과로 읽어낸다. 이 예에서는
문장의 분위기를 `긍정`으로 분류하며, 답변과 번역, 글 생성은 다른 문제의
예다.

#### Main visual

The transformed sequence becomes quiet but remains present as provenance.
One explicit task-to-result path becomes dominant:

```text
[ 0.51  -0.12  0.84  0.27  0.36  … ]
                  ↓ 문장 분류로 읽기
문장의 분위기
긍정
개념 예시 · 문장 분류

다른 자연어 처리 문제
질문 답변 · 번역 · 글 생성
```

This is an explanatory semantic example, not a runtime inference claim.

#### Transition

Transformed values remain visible above the result. The result enters below
without replacing the strip, and a subtle divider separates other task types.

#### Misconception avoided

`긍정` is a conceptual classification example, not an inference produced by
the current runtime.

#### Takeaway

같은 계산된 표현도 문제의 목적에 맞게 읽어야 사람이 쓰는 결과가 된다.

### 5. 다음 질문

#### Question

그런 숫자 표현을 만들기 전에 무엇부터 해야 하는가?

#### Core copy

문장을 숫자로 바꾸려면 먼저 작은 단위로 나눠야 한다. 어디에서 나눌지는
토크나이저에 따라 달라지며, 그 단위는 다음 Chapter에서 살펴본다.

#### Main visual

The source sentence returns to primary emphasis. Four conceptual boundaries
appear from left to right and settle at equal weight.

#### Transition

Boundary delays are `0ms`, `160ms`, `320ms`, and `480ms`; there is no idle
loop. Reduced motion shows the final four-boundary state immediately.

#### Misconception avoided

The displayed boundaries are conceptual, not actual tokenizer output. Exact
boundaries depend on the tokenizer.

#### Takeaway

숫자 표현을 만들기 전에 문장을 작은 단위로 나누며, 실제 경계는
토크나이저에 따라 달라진다. A quiet slide-scoped `Token이란? →` link opens
Chapter 0.2. Chapter 0.1 does not render a duplicate curriculum footer action
or its final full-width divider. The qualifier and link share `RIGHT_END` and
sit close to the deck-controls boundary.

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
- Key-takeaway boundaries use the same `CONTENT_START → WIDE_END` span as the
  deck-controls boundary while takeaway copy keeps its CONTENT measure.

Final production measurements:

| Viewport | Stage | LEFT | Gap | RIGHT |
| ---: | ---: | ---: | ---: | ---: |
| 1440×900 | 992×518.39px | 349.59px | 72px | 570.41px |
| 1366×768 | 992×491.75px | 351px | 68.30px | 572.70px |
| 1024×768 | 894.91×480px | 318.78px | 56px | 520.13px |

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
| 768×1024 | 698.63×416.72px | 698.63px |
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
- Chapter 0.1 exposes only the right-aligned Slide 5 inline handoff; its duplicate
  Chapter footer action and final full-width divider are absent.
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
.omo/evidence/golden-content-polish/browser/
```

Fresh project-subpath evidence:

```text
.omo/evidence/golden-content-polish/subpath-browser/
```

Slower Token-boundary follow-up evidence:

```text
.omo/evidence/golden-boundary-slow/browser/
.omo/evidence/golden-handoff-cleanup/browser/
.omo/evidence/golden-divider-alignment/browser/
```

Final polish evidence:

```text
.omo/evidence/golden-final-polish/browser/
.omo/evidence/golden-final-polish/subpath-browser/
```

Coverage:

- 30 viewport/state screenshots: six required viewports × five slides;
- five matched 1440px pre-polish states named `before-01-*` through
  `before-05-*`;
- exact desktop canonical files `01-language.png` through
  `05-token-preview.png`;
- 390px canonical files `07-slide-language-390.png` through
  `11-slide-token-390.png`;
- full-Chapter captures for Slide 1, Slide 3, and Slide 5;
- twelve rest/mid/settled transition frames plus the requested
  `02-to-03-*`, `04-result-transition.png`, and `05-boundary-*` aliases;
- `contact-6x5.png` and `contact-transitions.png`;
- root and `/transformer_viz/` `evidence.json`.

Both deployment bases contain thirty geometry records, zero state drift, zero
boundary delta, zero overflow, and zero runtime/network/console errors.

## Scope freeze

Chapter 0.2 and every later Chapter remain unchanged. Part 1, Part 2, GPT,
Transformer Block, Self-Attention, Lab, Score Matrix, ThreeUI shell, Worker,
model assets, tokenizer assets, root hosting, and project-subpath hosting keep
their established contracts.

No broader migration begins until explicit user visual approval.
