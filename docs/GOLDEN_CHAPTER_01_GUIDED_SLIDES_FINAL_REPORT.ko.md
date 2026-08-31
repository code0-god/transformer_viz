# Golden Chapter 0.1 Guided Slides 최종 구현 보고서

## 최종 상태

- Implementation: **COMPLETE**
- Automated verification: **PASS**
- Independent visual critique: **PASS**, 최종 product reviewer 2명 + transition evidence reviewer 2명
- User visual approval: **PENDING**
- Chapter 0.2 이후 visual migration: **HOLD**
- Push: **수행하지 않음**

이 보고서는 Chapter 0.1 `자연어 처리란?`만 다룬다. Chapter 0.2 이후 content,
Worker/Lab, Three.js/WebGPU, visualization engine, shared chapter shell, dependency
graph는 변경하지 않았다.

## 1. 왜 slide narrative로 바꿨는가

이전 구현은 같은 학습 흐름을 여러 vertical beat로 나눴다. 학습자는 문장,
숫자, 계산, 결과, 다음 개념의 관계를 이해하면서 동시에 현재 scroll 위치와
좌우 배치를 기억해야 했다. 첫 beat와 이후 beat의 폭도 달라 object
permanence가 약했다.

새 구조는 한 article-plane 안에서 한 번에 한 개념만 활성화한다. 설명은
LEFT, 시각 anchor는 RIGHT에 남는다. 사용자는 스크롤 위치가 아니라
`이전` / `다음` / 5개 step button으로 진행한다.

## 2. Slide architecture와 파일 분리

- `GoldenNarrativeDeck.tsx`
  - 5개 typed slide metadata
  - local active-index state
  - Previous / Next / direct-step controls
  - scoped arrow-key handling
  - fallback ordered list와 live semantics
- `VisualNarrative.tsx`
  - 현재 step context만 제공
  - 기존 long-scroll observer contract 제거
- `NlpPipelineDiagram.tsx`
  - 문장, numeric strip, slots, value phases를 한 번만 mount
  - `language | numeric | transform | result | token-preview`만 시각 상태로 반영
- `goldenNarrativeDeck.css`
  - article-plane grid와 compact controls
- `nlpGoldenNarrative.css`
  - persistent visual geometry
- `nlpGoldenNarrativeStates.css`
  - state opacity/transform, timing, reduced-motion

Presentation framework나 신규 dependency는 추가하지 않았다.

## 3. 고정 LEFT / RIGHT grid

Desktop은 동일한 38 / 62 grid와 column anchor를 모든 slide에서 공유한다.

- Chapter `CONTENT_START` = Golden `LEFT_START`
- Chapter `WIDE_END` = Golden `RIGHT_END`
- explanation left/width drift: `0px`
- visual left/width/center drift: `0px`
- measured desktop stage height:
  - 1440×900: `518.39px`
  - 1366×768: `491.75px`
  - 1024×768: `480px`

Stage가 slide마다 커지거나 줄지 않고, document가 유일한 scroll owner다.

## 4. Slide 1 — Language

- 질문: `자연어 처리란?`
- 활성 설명: 사람이 쓰는 언어를 컴퓨터가 이해하려면 무엇이 필요한가
- persistent sentence: `오늘 영화 정말 재미있었어요.`
- 표현 방식: large typography, container/card chrome 없음

첫 진입과 Chapter 재진입은 항상 Slide 1이다.

## 5. Slide 2 — Numeric

- 설명: 언어를 계산 가능한 숫자 표현으로 바꾸는 이유
- 시각: 한 줄의 6개 slot
- 예시: `0.24, -0.71, 0.18, 0.63, -0.09, …`
- 명시: `설명을 위한 예시 · 실제 모델 값 아님`

기존 `2×3 × 4` cell matrix와 row/column/tensor 해석 가능성을 완전히
제거했다.

## 6. Slide 3 — Transform

- 설명: 모델 계산은 같은 숫자 표현을 다른 값으로 바꾼다
- before label: `계산 전`
- after label: `계산 후`
- before와 after는 같은 6개 slot 안에서 교차 전환한다
- strip bounds: Slide 2와 Slide 3 모두 `432×46px`

별도 matrix, model box, scene 교체를 사용하지 않는다.

## 7. Slide 4 — Result

- 계산된 숫자가 task output으로 이어지는 관계를 설명한다
- primary result: `긍정`
- qualifier: `개념 예시`
- NLP 예: 번역, 음성 인식, 감정 분석, 문장 생성

`긍정`은 실제 모델 실행 결과가 아니라 학습용 개념 예시로 명시된다.

## 8. Slide 5 — Token Preview

- 같은 문장을 다시 전면에 둔다
- conceptual boundary를 sentence 위에 표시한다
- `실제 경계는 tokenizer마다 다릅니다`를 명시한다
- `Token이란? →` 링크는 Chapter 0.2 heading으로 이동하고 focus한다
- Browser Back은 Chapter 0.1 Slide 1, Forward는 Chapter 0.2를 복원한다

Chapter 0.2 content나 visual은 수정하지 않았다.

## 9. Numeric representation 의미

숫자는 neutral mixed-sign sample이다. 확률처럼 보이는 `0..1` 전용 값,
token별 칸, 행렬 축, production tensor 표기를 쓰지 않는다. Ellipsis는 실제
표현이 더 클 수 있음을 보인다.

Test와 browser probe가 다음을 함께 고정한다.

- mixed signs 존재
- illustrative disclaimer 존재
- forbidden matrix attributes/copy 없음
- Canvas/R3F 없음
- Slide 2→3 strip, slots, value phases DOM identity 유지

## 10. Object continuity와 motion

문장, visual root, numeric strip, 6개 slot, before/after value phase는 5개
상태 동안 mount된 채 유지된다. React는 scene를 교체하지 않고
`data-state`와 active semantics만 변경한다.

CSS motion:

- prose: discrete fade/translate
- persistent visual: opacity/transform/value crossfade
- autoplay 없음
- replay 없음
- `prefers-reduced-motion`에서는 최대 `0.01ms`, running animation `0`

Fresh transition evidence:

- language→numeric: rest/mid/settled 모두 다른 hash, active animations `5`
- numeric→transform: rest/mid/settled 모두 다른 hash, active animations `45`
- result→token: rest/mid/settled 모두 다른 hash, active animations `42`
- 세 transition 모두 `identity: true`

## 11. Mobile 구조

`768×1024`, `390×844`, `320×568`에서는 설명 한 개가 persistent visual
위에 놓인다. Slide navigation 구조는 desktop과 같다.

- local/nested scroll 없음
- horizontal overflow 없음
- mobile visual height: `216px`
- measured mobile stage height: 약 `411.59px`
- Previous / Next: `44×44px`
- controls와 Token link까지 320×568 viewport에서 보임

Mobile에서 별도 stack of cards나 대체 narrative를 만들지 않았다.

## 12. 접근성

- labeled `region`과 `navigation`
- current-step semantic과 `aria-live` count/copy
- 5단계 fallback ordered list
- native `button`과 disabled bounds
- visible `:focus-visible`
- direct-step controls의 44px row target
- visual description은 현재 상태에 맞춰 갱신
- ArrowLeft/ArrowRight는 deck scope 안에서만 동작
- input, textarea, select, contenteditable에서는 arrow key를 가로채지 않음
- wheel event는 cancel하지 않음

Lighthouse accessibility score는 final static build에서 `100`이다.

## 13. Before / After visual 비교

Evidence:

- `before-after-language.png`
- old/new Language capture similarity: 약 `94%`
- changed area: 약 `5.60%`
- alpha channel: intact

공통 Chapter header와 article typography는 유지하고, 긴 vertical beat stack만
안정된 single stage로 바뀌었다. 30개 viewport-state geometry record에서
state drift는 `0`이다.

## 14. Independent visual critique

Fresh complete artifact를 두 명의 independent reviewer가 각각 검토했다.

- Product reviewer A: `PASS`, confidence `0.97`
- Product reviewer B: `PASS`, confidence `0.94`
- 10개 질문: 두 reviewer 모두 10/10 PASS
- Accessibility/heuristic/persona matrix: PASS
- Blocking finding: `0`

첫 review에서 찾은 320×568 control clipping은 stage/visual height를 줄여
수정했고 fresh review를 다시 받았다.

Transition midpoint가 settled frame과 같았던 evidence defect도 capture
timing을 수정했다. 이후 evidence reviewer 2명이 다시 검토했다.

- Evidence reviewer A: `PASS`, blocking `0`
- Evidence reviewer B: `PASS`, confidence `0.99`, blocking `0`
- 세 midpoint 모두 rest/settled와 실제 pixel 차이가 있고 interpolation을
  보여 준다

남은 non-blocking 관찰:

- Result 상태의 매우 옅은 numeric note와 foreground qualifier baseline이
  가깝다. 이해를 막지 않는 Low polish finding으로 기록했다.
- root/subpath narrow screenshot 일부는 browser overlay scrollbar 4px 때문에
  byte hash가 다르다. Content geometry와 동작은 동일하다.

## 15. Automated, browser, performance verification

Final `docker compose exec -T web ./scripts/check.sh`:

- exit `0`
- `All checks passed.`
- Vitest: `87 files`, `612 tests`
- lifecycle Vitest: `1 file`, `7 tests`
- typecheck, Biome, production build, `cargo fmt`, `cargo clippy`,
  `cargo test`: PASS
- root Golden browser harness: PASS
- `/transformer_viz/` subpath harness: PASS

추가 검증:

- Python `py_compile`: PASS
- Python no-excuse rules: 6 files, 0 violations
- TypeScript no-excuse rules: 11 files, 0 violations
- LSP diagnostics: 0
- 6 viewports × 5 slides = 30 full-resolution state captures
- 9 transition originals
- 11 canonical captures
- 3 derived comparison/contact sheets
- total PNG evidence: `53`
- console/network/runtime errors: `0`
- pending RAF after settle: `0`

Direct Lighthouse CLI, same machine/static-server/throttling:

| Metric | baseline | guided slides |
|---|---:|---:|
| Performance | 66 | 63 |
| Accessibility | 100 | 100 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |
| TBT | 0ms | 0ms |
| LCP | 6004ms | 6151ms |
| CLS | 0.000208 | 0.000208 |

Performance score delta는 `-3`, LCP delta는 약 `+147ms`, TBT/CLS regression은
없다. Throttled FCP는 `4729ms → 6151ms`로 측정되어 기록에 남긴다. 이
Chapter 변경의 main bundle delta는 JS `+2523B`, CSS `+3171B`이며 idle
work, Canvas, R3F, 신규 dependency는 없다.

## 16. Git, scope, evidence

Verified local implementation commit:

- `5f53b74 refactor(learn): present NLP chapter as guided slides`

Product, direct Vitest, production-browser contract는 서로 분리하면 중간 commit이
green이 아니므로 한 atomic commit으로 묶었다. Design/docs/report는 별도
local docs commit으로 닫는다.

Push는 하지 않았다.

Evidence root:

- `.omo/evidence/golden-slide-rework/browser/`
- `.omo/evidence/golden-slide-rework/subpath-browser/`

Protected scope diff:

- dependency manifests/lockfile: 없음
- Chapter 0.2+: 없음
- Worker/Lab: 없음
- ThreeUI/visualization engine/crates: 없음
- named prior technical-fix files: 없음

## 17. Completion과 approval gate

현재 판정:

- Implementation: **COMPLETE**
- Automated: **PASS**
- Independent critique: **WRITTEN AND PASS**
- User visual approval: **PENDING**

이 상태에서 migration은 멈춘다. User가 screenshots와 실제 동작을 승인하기
전에는 Chapter 0.2 이후에 같은 구조를 전개하거나 push하지 않는다.
