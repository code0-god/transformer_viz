# Golden Chapter 0.1 Content & Visual Polish 최종 보고서

## 최종 상태

- Implementation: **COMPLETE**
- Automated verification: **PASS**
- Independent visual critique: **PASS**, fresh final reviewers 2명
- User visual approval: **PENDING**
- Chapter 0.2 이후 migration: **HOLD**
- Remote push: **수행하지 않음**

## 1. Copy Audit

LEFT copy를 slide당 하나의 질문과 2문장 중심으로 정리했다.

- Slide 1: 사람이 문장에서 뜻과 분위기를 읽는 이유
- Slide 2: 컴퓨터 계산에 숫자 표현이 필요한 이유
- Slide 3: 계산이 같은 숫자 표현의 값을 바꾸는 방식
- Slide 4: 계산된 표현을 문제에 맞는 결과로 읽는 방식
- Slide 5: 숫자 표현 전에 문장을 나누는 질문

`검은 상자`, implementation meta 설명, 아직 배우지 않은 matrix/tensor/
embedding 용어를 user-facing copy에서 사용하지 않았다. Header subtitle,
intro, 핵심 정리, 자연어 glossary는 그대로 유지했다.

## 2. Slide 1 — 사람이 읽는 언어

RIGHT의 가장 강한 object는 계속 다음 문장이다.

```text
오늘 영화 정말 재미있었어요.
```

문장 크기를 키우고 `재미있었어요`에 1px underline을 적용했다. 아래의
`긍정적인 느낌` semantic cue는 제거해 `긍정` 해석이 Slide 4에서 처음
명시되게 했다. Quote card, speech bubble, sentiment badge를 추가하지 않았다.

## 3. Slide 2 — 계산 가능한 표현

### Why numeric

LEFT는 컴퓨터가 `재미있다`라는 뜻 자체를 계산하지 않으며, 덧셈과 곱셈을
하려면 문장을 숫자로 이루어진 표현으로 바꿔야 한다고 직접 설명한다.

### Numeric strip

```text
오늘 영화 정말 재미있었어요.
              ↓
          숫자로 표현
0.24  -0.71  0.18  0.63  -0.09  …
```

Strip은 desktop RIGHT width의 `82%`, `467.72×70px`를 사용한다. 기존보다
높이와 숫자 크기를 키웠고, 320/390px에서도 여섯 slot을 한 줄로 유지한다.
`설명을 위한 예시 · 실제 모델 값 아님`은 strip 아래의 secondary note다.
Sentence에서 `숫자로 표현 ↓`까지 이어지는 vertical line을 추가해 label과
arrow가 하나의 transformation axis로 읽힌다.

## 4. Slide 3 — 모델 계산

### Before / After

한 `NUMERIC_VALUES` source가 각 slot의 before/after 값을 함께 소유한다.

### Value morph

```text
 0.24    -0.71     0.18     0.63     -0.09
   ↓        ↓        ↓        ↓        ↓
 0.51    -0.12     0.84     0.27      0.36
```

### Calculation causality

`여러 계산`은 strip 전체에 한 번만 표시한다. 각 arrow는 독립 계산을 뜻하는
것이 아니라 동일 slot의 value continuity를 보여 준다. Before value가 위로
옅어지고 after value가 같은 cell center에서 출발해 아래에 나타난다. Strip,
six slots, value phase DOM
identity와 `467.72×70px` bounds는 Slide 2와 동일하다.

## 5. Slide 4 — 사람이 사용하는 결과

### Numeric → Result

변환된 strip은 `0.42` opacity로 위에 남는다. `문장 분류로 읽기 ↓`가
24px vertical axis로 provenance와 결과를 직접 연결한다. 다른 NLP 문제
목록은 더 작은 type과 낮은 contrast로 한 단계 약하게 했다.

### Task hierarchy

```text
문장의 분위기
긍정
개념 예시 · 문장 분류

다른 자연어 처리 문제
질문 답변 · 번역 · 글 생성
```

`긍정`은 output value, `문장 분류`는 example task, 질문 답변/번역/글 생성은
다른 task다. Subtle divider와 type scale로 세 semantic level을 분리했다.
Measured strip/result overlap은 여섯 viewport 모두 `0px`다.

## 6. Slide 5 — 다음 질문

### Progressive boundaries

같은 sentence의 conceptual boundaries가 `0/160/320/480ms` delay로 왼쪽부터
나타난다. Settled state에서는 네 경계가 같은 weight다. Idle loop는 없다.

### Token handoff

`개념적 경계 · 실제 경계는 토크나이저에 따라 달라집니다.`를 유지했다.
별도 CTA card 없이 작은 `Token이란? →` link만 사용한다. Link는 Chapter
0.2 H1로 이동하고 focus하며, Back/Forward contract도 통과한다. 중복되던
페이지 하단 Chapter footer와 full-width final divider는 Chapter 0.1에서
렌더링하지 않는다. 보조 문구와 link는 RIGHT_END에 맞춰 오른쪽 정렬하고
deck-controls 경계에서 `8px` 위에 배치했다.

## 7. Visual Causality

- Slide 2: 같은 문장에서 `숫자로 표현 ↓` 축을 따라 한 줄 숫자 표현이
  직접 이어진다.
- Slide 3: 같은 six slots 안에서 before value가 옅어지고 after value가
  나타나며, 각 arrow는 독립 계산이 아닌 slot correspondence를 표시한다.
- Slide 4: transformed strip을 남긴 채 `문장 분류로 읽기 ↓`를 거쳐
  `긍정` 결과로 이어진다.
- Slide 5: 처음 문장에 conceptual boundaries가 왼쪽부터 하나씩 나타난다.

다섯 slide를 순서대로 보면 `사람의 언어 → 숫자 표현 → 계산으로 값 변화
→ 목적에 맞는 결과 → Token 질문`의 한 인과관계가 끊기지 않는다.

## 8. Visual Scale / Whitespace

- Desktop stage: `432px` (`1440px` 기준 `16.7%` 감소)
- Desktop LEFT/RIGHT: `38/62`
- Gap: `56–72px`
- Numeric strip: RIGHT width의 `82%`
- Visual center drift: `0px`
- Stage height drift: `0px`
- Card/Figure border: `0px`
- 핵심 정리 boundary와 deck-controls boundary 좌우 끝 차이: `0px`

Stage 자체를 다시 설계하거나 키우지 않았다. Sentence, numeric strip,
result, token sentence가 고정 RIGHT zone을 의미 있게 사용한다.

## 9. Object Continuity

다음 object는 5개 slide 동안 mount된 채 유지된다.

- deck root
- visual root
- source sentence
- numeric strip
- six value slots
- before/after phase nodes

Browser motion records 네 sequence 모두 `identity: true`다. LEFT copy만
discrete fade/translate하며, RIGHT는 opacity/transform/color transition으로
이어진다.

## 10. Mobile

768/390/320px 모두 explanation → visual → controls 순서를 유지한다.

| Viewport | Stage | Strip | Numeral |
| ---: | ---: | ---: | ---: |
| 768×1024 | 698.63×386px | 698.63×54px | 13.12px |
| 390×844 | 358×386px | 358×54px | 12.09px |
| 320×568 | 288×386px | 288×54px | 11.2px |

Active copy는 실제 sticky-header bottom 아래로 배치된다. 다섯 320px
original 모두 label/copy/control이 보이며 `copyHeaderOverlap = 0`,
document/local overflow `0`이다.

## 11. Accessibility

- complete `role="img"` description
- five persistent summaries, one current summary
- native Previous/Next/direct-step buttons
- 44×44px Previous/Next targets
- `aria-current="step"`와 live count/copy
- input/textarea/select/contenteditable arrow exclusion
- Token handoff destination H1 focus
- reduced motion에서 complete state 즉시 노출

Reduced-motion records는 다섯 state 모두 running animation `0`, maximum
duration `0.01ms`다.

## 12. Independent Visual Critique

첫 final pixel/CJK review는 `REVISE`했다.

- Slide 4의 `숫자 표현은 ... 읽어냅니다` 조사 관계
- 320px copy의 `답변·` orphan
- Result→Token midpoint에서 outgoing result와 incoming qualifier/handoff
  동시 노출

Copy를 `계산된 숫자 표현을 문제의 목적에 맞는 결과로 읽어냅니다.`로
바꾸고 네 줄 mobile rhythm을 복원했다. Token handoff는 모든 slide에서
mount하되 비활성 상태에서 숨기고, qualifier와 함께 240ms 뒤 나타나게
해 early midpoint의 `incomingOpacity`를 `0`으로 고정했다.

Fresh fixed-build reviewers:

- causal/design-system reviewer: **PASS**, confidence `0.98`, blockers `0`
- pixel/CJK reviewer: **PASS**, confidence `0.97`, blockers `0`

두 reviewer 모두 26/26 required captures를 직접 검토했고, copy clarity,
visual causality, scale, object continuity, hierarchy, CJK, educational
accuracy를 구체적으로 평가했다. Hard question은 둘 다 **YES**로 판정했다.

## 13. Screenshot Evidence

Evidence root:

```text
.omo/evidence/golden-content-polish/browser/
.omo/evidence/golden-content-polish/subpath-browser/
.omo/evidence/golden-boundary-slow/browser/
.omo/evidence/golden-handoff-cleanup/browser/
.omo/evidence/golden-divider-alignment/browser/
.omo/evidence/golden-final-polish/browser/
.omo/evidence/golden-final-polish/subpath-browser/
.omo/evidence/golden-freeze-pass/browser/
.omo/evidence/golden-freeze-pass/subpath-browser/
```

Coverage:

- 30 viewport/state originals
- 5 matched 1440px pre-polish states
- desktop `01-language.png` … `05-token-preview.png`
- full-Chapter Slide 1 / Slide 3 / Slide 5
- five 390px aliases
- 12 transition rest/mid/settled originals
- `02-to-03-before/mid/after.png`
- `04-result-transition.png`
- `05-boundary-step-1.png`, `05-boundary-final.png`
- `contact-6x5.png`, `contact-transitions.png`
- 62 candidate screenshots + 5 baseline screenshots per deployment base
- before/after image diff: Slide 2 `2.76%`, Slide 3 `3.84%`,
  Slide 4 `5.03%`, Slide 5 `2.37%`

## 14. Tests

Final canonical `./scripts/check.sh`:

- exit `0`
- `All checks passed.`
- Vitest: `87 files / 617 tests`
- lifecycle Vitest: `1 file / 7 tests`
- Biome, TypeScript, production root/subpath builds: PASS
- cargo fmt, clippy native/WASM, workspace tests/build: PASS
- Golden root browser: PASS
- Golden `/transformer_viz/` browser: PASS

Additional final-polish checks:

- focused Vitest: `5 files / 87 tests`
- flat/combined public-base Python routing: `2 tests`
- Python no-excuse: final changed scripts / `0 violations`
- TypeScript no-excuse: final changed files / `0 violations`
- Impeccable detector: `[]`
- Lighthouse before/after: Performance `63 → 63`, TBT `0 → 0ms`,
  CLS unchanged `0.000208`

## 15. Git

Final verified implementation commit:

- `396b3b9 fix(learn): finalize NLP slide polish`

`80ea315`의 main copy/causality polish와 `2d888ee`의 handoff alignment 위에서
Slide 4 문법·mobile wrapping, Result→Token sequencing, semantic/rapid
navigation tests, matched before/after와 full-Chapter capture contract를 하나의
atomic green behavior로 닫았다. Documentation/report는 별도 local commit으로
닫는다. Dependency manifests와 lockfile은 그대로이며 remote push는 하지
않는다.

마지막 freeze refinement는 사용자 visual approval를 위해 local worktree에
유지하며 아직 commit하지 않는다.

## 16. User visual approval

Current state:

- Implementation: **COMPLETE**
- Automated verification: **PASS**
- Independent visual critique: **PASS**
- User visual approval: **PENDING**

Explicit user approval 전에는 Chapter 0.2 이후로 이 visual pattern을
migration하거나 remote branch에 push하지 않는다.
