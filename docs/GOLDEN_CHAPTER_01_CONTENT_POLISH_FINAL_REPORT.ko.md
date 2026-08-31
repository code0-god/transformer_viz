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
`긍정적인 느낌`은 semantic cue일 뿐 badge나 model output UI가 아니다.
Quote card, speech bubble, sentiment badge를 추가하지 않았다.

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
옅어지고 after value가 아래에 나타난다. Strip, six slots, value phase DOM
identity와 `467.72×70px` bounds는 Slide 2와 동일하다.

## 5. Slide 4 — 사람이 사용하는 결과

### Numeric → Result

변환된 strip은 `0.42` opacity로 위에 남는다. `문장 분류로 읽기 ↓`가
provenance와 결과를 직접 연결한다.

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
deck-controls 경계 가까이에 배치했다.

## 7. Visual Scale / Whitespace

- Desktop stage: `480–518.39px`
- Desktop LEFT/RIGHT: `38/62`
- Gap: `56–72px`
- Numeric strip: RIGHT width의 `82%`
- Visual center drift: `0px`
- Stage height drift: `0px`
- Card/Figure border: `0px`
- 핵심 정리 boundary와 deck-controls boundary 좌우 끝 차이: `0px`

Stage 자체를 다시 설계하거나 키우지 않았다. Sentence, numeric strip,
result, token sentence가 고정 RIGHT zone을 의미 있게 사용한다.

## 8. Object Continuity

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

## 9. Mobile

768/390/320px 모두 explanation → visual → controls 순서를 유지한다.

| Viewport | Stage | Strip | Numeral |
| ---: | ---: | ---: | ---: |
| 768×1024 | 698.63×416.72px | 698.63×54px | 13.12px |
| 390×844 | 358×411.59px | 358×54px | 12.09px |
| 320×568 | 288×411.59px | 288×54px | 11.2px |

Active copy는 실제 sticky-header bottom 아래로 배치된다. 다섯 320px
original 모두 label/copy/control이 보이며 `copyHeaderOverlap = 0`,
document/local overflow `0`이다.

## 10. Accessibility

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

## 11. Independent Visual Critique

첫 fresh review는 320px sticky-header occlusion을 발견해 `REVISE`했다. Copy,
mobile rhythm, evidence positioning을 수정하고 전체 evidence를 다시
생성했다.

Final fresh reviewers:

- causal/design-system reviewer: **PASS**, confidence `0.98`, blockers `0`
- pixel/CJK reviewer: **PASS**, confidence `0.98`, blockers `0`

두 reviewer 모두 Slide 2 illustrative meaning, Slide 3 calculation cause,
Slide 4 task/result hierarchy, Slide 5 Token preview를 YES로 판정했다.

## 12. Screenshots

Evidence root:

```text
.omo/evidence/golden-content-polish/browser/
.omo/evidence/golden-content-polish/subpath-browser/
.omo/evidence/golden-boundary-slow/browser/
.omo/evidence/golden-handoff-cleanup/browser/
.omo/evidence/golden-divider-alignment/browser/
```

Coverage:

- 30 viewport/state originals
- desktop `01-language.png` … `05-token-preview.png`
- `06-full-chapter.png`
- five 390px aliases
- 12 transition rest/mid/settled originals
- `02-to-03-before/mid/after.png`
- `04-result-transition.png`
- `05-boundary-step-1.png`, `05-boundary-final.png`
- `contact-6x5.png`, `contact-transitions.png`
- 59 manifest-tracked screenshots per deployment base

## 13. Tests

Final canonical `./scripts/check.sh`:

- exit `0`
- `All checks passed.`
- Vitest: `87 files / 615 tests`
- lifecycle Vitest: `1 file / 7 tests`
- Biome, TypeScript, production root/subpath builds: PASS
- cargo fmt, clippy native/WASM, workspace tests/build: PASS
- Golden root browser: PASS
- Golden `/transformer_viz/` browser: PASS

Additional:

- focused Vitest: `2 files / 15 tests`
- flat/combined public-base Python routing: `2 tests`
- Python no-excuse: `8 files / 0 violations`
- TypeScript no-excuse: `3 files / 0 violations`
- Impeccable detector: `[]`
- Lighthouse before/after: Performance `63 → 63`, TBT `0 → 0ms`,
  CLS unchanged `0.000208`

## 14. Git

Verified local implementation commit:

- `80ea315 refactor(learn): polish NLP slide narrative`

Product, direct tests, browser evidence contracts, and base-routing fix are one
atomic green behavior. Documentation/report are closed in a separate local
commit. Dependency manifests and lockfile are unchanged. Remote push was not
performed.

## 15. User visual approval

Current state:

- Implementation: **COMPLETE**
- Automated verification: **PASS**
- Independent visual critique: **PASS**
- User visual approval: **PENDING**

Explicit user approval 전에는 Chapter 0.2 이후로 이 visual pattern을
migration하거나 remote branch에 push하지 않는다.
