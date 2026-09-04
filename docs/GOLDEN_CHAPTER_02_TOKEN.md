# Golden Chapter 0.2 — Token이란?

## Status

- Baseline: `origin/main` at `04fb1fa`
- Branch: `feat/golden-token-chapter`
- Mode: Read
- Visual grammar: Segmentation
- User visual approval: `PENDING`
- Remote push: not performed

Chapter 0.2 inherits Chapter 0.1's five-step guided-stage interaction without
copying its numeric visual language. Chapter 0.1 remains frozen.

## Learning goals

After Chapter 0.2, a learner should be able to explain:

1. Token is a text unit the model treats as one position in a sequence.
2. Token is not necessarily the same as a human-counted word.
3. A tokenizer decides the boundaries.
4. Different tokenizers can produce different sequences from the same text.
5. nanoGPT Edu currently uses byte units.
6. Token and Token ID are separate concepts.

The closing question is: "그 Token을 컴퓨터에서는 어떤 숫자로 가리킬까?"

## Final refinement invariants

- Token: `모델이 순서열의 한 칸으로 다루는 텍스트 단위`
- Current model: `byte_fallback_v1`
- Visual semantics: boundary uses segmentation color; selection uses the
  canonical green/teal accent
- Slide 4 RIGHT: `현재 nanoGPT Edu · byte 기반` appears once

## Final refinement

### Serial-processing wording

- Slide 1 before: wording implied sequential execution
- Slide 1 after: each unit occupies a first, second, and subsequent position in
  a sequence
- Slide 2 before: wording implied one-unit-at-a-time processing
- Slide 2 after: `모델이 순서열의 한 칸으로 다루는 각각의 텍스트 단위`

The Chapter defines ordered positions only. It does not teach execution
scheduling, autoregressive decoding, causal attention, prefill, or
parallelism.

### Label and color semantics

- Slide 4 keeps one RIGHT label: `현재 nanoGPT Edu · byte 기반`.
- Slide 5 selection uses `--ui-accent` and `--ui-control-highlight`.
- Segmentation boundaries continue to use `--figure-highlight`.
- Selected `c` remains structurally raised while neutral `a` and `t` recede.

The summary and glossary now share the canonical Token definition. The
accessible summaries use the same sequence-position language and identify the
selected `c` without assigning an actual Token ID.

## Responsibility boundary

- 0.2 owns Token, boundaries, tokenizer responsibility, and the current
  model's minimum byte fact.
- 0.3 owns Vocabulary and Token ID mapping.
- 0.4 owns Word, Character, Subword, Byte method comparison.
- Embedding lookup remains in Part 2.

Chapter 0.2 does not teach a vocabulary table, a concrete Token ID, embedding
rows, BPE merge rules, GPT-2 tokenization, or a four-method comparison.

## Current tokenizer verification

The Chapter copy follows project runtime truth in this order: Rust
implementation, canonical model assets, generated protocol, fixtures/tests,
then documentation.

| Fact | Evidence |
| --- | --- |
| Tokenizer kind is `byte_fallback_v1` | `assets/models/edu/tokenizer.json:5` |
| Content is encoded one UTF-8 byte at a time | `crates/nanogpt-tokenizer/src/lib.rs:70-95` |
| Generation uses BOS plus prompt bytes and no EOS | `crates/nanogpt-tokenizer/src/lib.rs:100-132` |
| BOS/EOS/UNK IDs are reserved; byte IDs start at offset 3 | `assets/models/edu/tokenizer.json:2-7` |
| Vocabulary size is 259 | `assets/models/edu/config.json:8` |
| ASCII `cat` becomes three content-byte units | `crates/nanogpt-tokenizer/tests/tokenizer.rs:172-185` |
| Korean `한` becomes three UTF-8 byte units | `crates/nanogpt-tokenizer/tests/curriculum_examples.rs:95-117` |
| Printable ASCII bytes display as their characters | `crates/nanogpt-tokenizer/src/lib.rs:203-210` |

`cargo test -p nanogpt-tokenizer` passes 17 integration tests. The learner
surface shows only the content units `c`, `a`, `t`; reserved markers and IDs
remain implementation evidence because they are not needed to answer this
Chapter's question.

## Five slides

### 1. 왜 문장을 나눌까요?

The sentence `오늘 영화 정말 재미있었어요.` continues directly from Chapter
0.1. Four thin conceptual boundaries appear on the same sentence object.

Qualifier:

> 개념적 경계 · 실제 경계는 토크나이저가 정합니다.

### 2. 나뉜 한 단위가 Token

The same sentence becomes five ordered, thin text chips. Small ordinals
reinforce sequence without turning the composition into a vocabulary table.

### 3. Token은 단어와 항상 같지 않음

One conceptual contrast shows a human-counted word `cats` and a possible
`cat | s` Token boundary. The same text first reveals its boundary, then its
two intrinsic-width Token chips separate. No arrow, fork, or flow line is
rendered. It is explicitly labeled as an explanatory example.

### 4. 현재 nanoGPT Edu의 방식

The verified ASCII example keeps `cat` in place, reveals `c | a | t`, then
separates the three intrinsic-width byte Token chips.

Hierarchy:

1. `현재 nanoGPT Edu · byte 기반`
2. `cat`
3. `c | a | t` boundary reveal
4. `[c] [a] [t]` separation
5. `ASCII 예시에서 c, a, t는 각각 한 byte입니다.`

The Chapter does not claim every Transformer uses byte tokenization and does
not equate byte with visible character.

### 5. Token을 숫자로 어떻게 가리킬까?

The `c | a | t` rail stays mounted. `c` is selected, the other units recede,
and one short downward connector leads to the unknown numeric identity `?`.
No concrete ID is shown.

The shared Chapter page contract owns adjacent-Chapter navigation:

- `← 자연어 처리란?`
- `Vocabulary와 Token ID →`

The links are rendered after Summary and Glossary at the bottom of the page.
They remain visible in the DOM and accessible for all five slide states rather
than appearing only on Slide 5. Both links land at document top and focus the
destination Chapter H1.

The same footer placement applies to all 14 curriculum Chapters. Chapter 0.1
therefore uses its page-bottom Next link instead of a Slide 5 handoff. The
first and last Chapters render only the available direction while preserving
the same left/right edge alignment.

## Object continuity

- Slide 1: inherited Korean sentence and conceptual boundaries
- Slide 2: same sentence rail gains Token treatment and order
- Slide 3: same TokenChip primitive resegments one word
- Slide 4: the primitive grounds the current byte implementation
- Slide 5: the same byte rail selects one Token

All visual layers remain mounted inside one DOM Figure. State changes alter
opacity, transform, borders, and emphasis instead of replacing the Figure.

## Motion

- 1 → 2: boundary to separated ordered units
- 2 → 3: `cats` boundary reveal, then intrinsic Token-chip separation
- 3 → 4: `cat` byte-boundary reveal, then intrinsic Token-chip separation
- 4 → 5: select one Token and reveal the next question

Motion is user-driven. There is no idle RAF, Canvas, Three.js, autoplay, or
scroll-triggered progression. Reduced motion snaps to every complete state
with no running animation.

Segmentation has one fixed grammar:

`TEXT → BOUNDARY APPEARS → SEGMENTS SEPARATE → TOKEN CHIPS`

The arrows above describe state order only; production segmentation renders no
arrow, fork, or flow line. Slide 5 is the sole directional concept connector,
mapping the selected Token to the Token ID question. Chapter navigation uses
text arrows only.

## Layout and mobile

The Chapter reuses the canonical Golden geometry:

| Viewport | Stage |
| --- | --- |
| 1440×900 | 992×432px |
| 1366×768 | 992×432px |
| 1024×768 | Golden two-column stage at 432px |
| 768×1024 | stacked 386px stage |
| 390×844 | 358×386px |
| 320×568 | 288×386px |

Desktop Golden copy and active visual content both begin 32px below the Stage
top. Every slide keeps each offset within 24–48px and their difference within
24px. The Stage remains 432px tall; unused space becomes lower breathing room.

Mobile preserves one active slide in the order Explanation → Visual →
Navigation. Explanation-to-visual grid gap is 16px and the Stage remains 386px
tall; remaining space moves below the visual. Token chips may wrap naturally
while their source order remains unchanged. Document and local horizontal
overflow are zero in all viewport-state combinations.

## Accessibility

- One semantic visual summary exists for each stage.
- The DOM source keeps explanation before visual.
- The persistent Figure exposes one `role="img"` and a structured fallback.
- Previous, progress, Next, ArrowLeft, and ArrowRight reuse the Golden deck
  contract.
- The page footer uses one persistent semantic navigation with two links after
  all learning content.
- Focus, selected state, and the unknown identity do not rely on color alone.

## Chapter 0.1 semantic regression evidence

The new canonical top alignment supersedes the previous pixel freeze. Chapter
0.1 copy and visual semantics remain unchanged while their vertical placement
now follows the same Golden Stage top contract.

- Desktop stage: 432px
- Mobile stage: 386px
- Five-slide content, navigation, reduced motion, and runtime behavior:
  unchanged
- LEFT and visible RIGHT content: top-anchored
- Slide-local `Token이란? →` handoff removed; the persistent page-bottom
  adjacent navigation owns the same destination.

## Performance and Lighthouse

Lighthouse 13.4.1 ran through its Node API against real Google Chrome stable,
using the same production artifact for Chapters 0.1 and 0.2. Each route and
form factor ran three times; values below are medians.

| Surface | Form | Performance | Accessibility | Best Practices | SEO | TBT | CLS |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 0.1 | Mobile | 56 | 100 | 100 | 100 | 0ms | 0.14923 |
| 0.2 | Mobile | 56 | 100 | 100 | 100 | 0ms | 0.14923 |
| 0.1 | Desktop | 56 | 100 | 100 | 100 | 0ms | 0.14923 |
| 0.2 | Desktop | 56 | 100 | 100 | 100 | 0ms | 0.14923 |

Chapter 0.2 introduces no category-score, TBT, or CLS regression against the
frozen 0.1 route. Both routes remain dominated by the same model/Worker startup
under simulated throttling.

React Doctor scanned the changed React scope with no Performance or
Accessibility findings. It retained one pre-existing Maintainability warning
for the component file's exported stage constant. No audit dependency was
added to the project.

## Evidence

```text
.omo/evidence/golden-token-chapter/baseline-01/
.omo/evidence/golden-token-chapter/final/
.omo/evidence/golden-token-chapter/final-01-regression/
.omo/evidence/golden-token-chapter/lighthouse/
.omo/evidence/golden-token-refinement/fresh/
.omo/evidence/golden-token-refinement/chapter-01-regression/
.omo/evidence/golden-token-navigation/fresh/
```

`final/` contains:

- all five states at six viewports;
- the required desktop, mobile, and full-page screenshots;
- before/mid/after evidence for all four transitions;
- reduced-motion, performance, navigation, geometry, and error evidence.

`golden-token-refinement/fresh/` contains 12 fresh host-Chrome captures:
Slides 1, 2, 4, and 5 at 1440×900, 390×844, and 320×568. Every capture has
zero copy, deck, and document overflow; Canvas and idle RAF remain zero.
Independent functional, visual/CJK, and content reviews each returned `PASS`
with confidence `0.99`.

`golden-token-navigation/fresh/` contains the final paired-link state at
1440×900, 390×844, and 320×568. Both link targets remain 44px, overlap and
horizontal overflow are zero, and all 14 Chapter routes report zero shared
footer bars.

## Final verification

- Independent content review: `PASS` with confidence `0.99`
- Independent functional visual review: `PASS` with confidence `0.99`
- Independent visual/CJK review: `PASS` with confidence `0.99`
- Final-refinement focused tests: 8/8
- Focused Token/content/registry tests: 32/32
- Full web tests: 623/623 plus lifecycle 7/7
- Python provenance/bootstrap tests: 30/30
- Rust tokenizer integration tests: 17/17
- Full Rust workspace tests, rustfmt, native Clippy, and WASM Clippy: `PASS`
- Biome, TypeScript typecheck, and TypeScript no-excuse checks: `PASS`
- Root and `/transformer_viz/` production builds: `PASS`
- Root and `/transformer_viz/` Learning Workspace browser contracts:
  41 screenshots each, `PASS`
- Root and `/transformer_viz/` ArrowLeft, ArrowRight, and adjacent navigation:
  correct stages, `scrollY = 0`, next-Chapter H1 focused
- Standalone Golden/benchmark Visual Narrative browser automation: `PASS`
- Remaining Scene Visual Reboot browser automation: 43 screenshots, `PASS`
- Root and `/transformer_viz/` Golden Chapter 0.1 browser contracts: `PASS`
- Complete `scripts/check.sh`: `All checks passed.`

The canonical browser contract now records Chapter 0.2 as a full-width Golden
Figure, locks the 432/386px stage geometry, and tests navigation from the
Chapter's intentionally shorter compact page.

## Local commit strategy

No commit has been created. If approval is granted, the current work separates
cleanly into:

1. `feat(learn): build Golden Token chapter` — product, contracts, tests, and
   browser automation
2. `docs(learn): record Golden Token evidence` — this evidence record

## Deferred canonicalization

Chapter 0.2 does not change the global Golden contract or `DESIGN.md`.
Segmentation-specific rules remain local until explicit user visual approval.
