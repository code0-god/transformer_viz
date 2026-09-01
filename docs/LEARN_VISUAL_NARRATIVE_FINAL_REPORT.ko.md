# Learn Visual Narrative Priority-0 최종 보고서

## 상태

- Implementation: COMPLETE
- Automated gates: PASS
- Independent visual critique: 장점과 잔여 문제를 아래 13절에 기록
- User visual approval: PENDING
- 나머지 11개 Chapter migration: 승인 전 금지

## 1. Figure-first 구조를 폐기한 이유

기존 흐름은 `Article → 제목/설명 → 카드형 Figure → controls/replay →
caption → Article`이었다. 학습자는 설명을 읽다가 별도 위젯으로 이동하고,
위젯 사용법과 caption을 해석한 뒤 다시 본문으로 돌아와야 했다. Figure의
교육 내용이 맞아도 읽기 흐름은 끊겼다.

새 흐름은 `prose beat → 같은 visual의 상태 변화 → 다음 prose beat가 그
변화를 해설`한다. 시각화는 본문의 목적지가 아니라 문장이 진행되는 같은
학습 표면이다.

## 2. Visual Narrative architecture

```text
LearningGuide
└─ VisualNarrative
   ├─ article prose beats
   ├─ semantic LearningFigure
   │  └─ existing SceneFigure lifecycle/runtime/fallback
   └─ compact native direct-access controls
```

`VisualNarrative`는 layout과 active stage만 소유한다. `SceneFigure`는 기존
lazy import, visibility, WebGL capability, error isolation, context lifecycle,
semantic fallback, reduced motion, demand rendering을 계속 소유한다. 신규
animation/scroll library나 범용 visual DSL은 추가하지 않았다.

## 3. 세 layout primitive

- **INLINE NARRATIVE**: CONTENT plane에서 prose와 얇은 visual을 연속 배치.
- **TEXT + VISUAL SPLIT**: WIDE plane에서 prose 왼쪽, visual 오른쪽 배치.
- **STICKY VISUAL NARRATIVE**: prose가 한 spatial stage를 구동하며 sticky는
  narrative section 내부에서만 유지.

세 primitive 모두 article background와 grid를 공유한다. Full bleed, card,
shadow, large radius, 강제 scroll behavior는 없다.

## 4. Tokenization: old → new → flow

**Old:** 독립 Figure 안에서 제목, 설명, 큰 tinted panel, replay rail을 먼저
해석해야 했다.

**New:** 0.2 Chapter를 Inline Narrative로 교체했다. 실제 sentence strip이
주인공이며 visual height는 content에 맞춘다.

```text
SOURCE
→ BOUNDARIES
→ SEPARATED CHIPS
```

word-like/current-byte truth는 compact selector로 유지했다. Desktop scene은
약 217px, 320px viewport에서는 약 103px다. tokenizer data source와 수치
semantics는 바꾸지 않았다.

## 5. Token Embedding: old → new → split

**Old:** 설명을 끝낸 뒤 별도 Figure에서 좁은 table과 vector를 확인했다.

**New:** 2.1 Chapter를 Text + Visual Split으로 교체했다. prose와 lookup
과정을 동시에 볼 수 있게 visual column을 600px scene breakpoint보다 넓게
확보했다.

```text
ID
→ ROW LOOKUP
→ ROW LIFT
→ STANDALONE VECTOR
```

선택 row와 standalone vector는 같은 색 관계를 유지한다. Desktop은
ID→table→vector 가로 구성, mobile은 의도한 세로 구성이다.

## 6. Self-Attention: old → new → bounded sticky

**Old:** 설명과 여러 Figure/state가 반복되어 단계마다 새 Figure로 이동하는
인상이 강했다.

**New:** 요청의 5.0 Self-Attention benchmark를 현재 curriculum의 5.1
Self-Attention Chapter route에 매핑해 하나의 bounded Sticky Visual
Narrative로 교체했다. 기존 Chapter 번호와 route는 바꾸지 않았다.

```text
Overview
→ Q/K/V
→ Scores
→ Mask
→ Softmax
→ Weighted V
```

Desktop에서는 prose 여섯 beat가 한 scene과 한 Canvas를 구동한다. Sticky
visual top은 90px, 실제 Header bottom은 65px로 측정됐다. Section 끝에서
다음 content와 overlap은 없었다. 768px 이하에서는 normal flow다.

## 7. 제거한 controls

- narrative 내부 SceneFigure replay rail
- 중복 Back/Next rail
- 개발자 지향 상태 설명
- Figure가 먼저 보이게 만들던 큰 control footer

남은 controls는 tokenizer selector와 compact stage direct access뿐이다.
모두 native button이며 click, focus, Enter, Space, touch를 지원한다. Normal
page scroll이 primary progression이다.

## 8. 제거한 Figure visual chrome

- visible Figure heading/subtitle
- outer border와 card background
- large radius와 shadow
- local tinted depth panel
- caption divider와 visible caption box
- Canvas 자체를 드러내는 visual boundary

`figure`와 `figcaption` semantic은 유지한다. Caption은 visually hidden이며
fallback도 prose/visual/prose 흐름 안에 남는다.

## 9. Mobile reading model

- Split과 Sticky를 one-column normal flow로 전환.
- DOM order는 first beat → visual → remaining beats.
- Sticky 비활성화.
- 같은 state geometry box를 유지해 layout jump 억제.
- 최소 44px target 유지.
- 320/390/768px에서 document/local horizontal overflow 0.
- Tokenization 약 103–128px, Embedding 약 160–199px, Attention 약
  195–242px로 scene 높이를 content에 맞춤.

Mobile에서는 prose와 visual이 desktop처럼 동시에 나란히 보이지 않고
순차적으로 읽힌다. 이는 독립 critique의 잔여 문제로 유지한다.

## 10. Accessibility

- 기존 article heading hierarchy 유지.
- Architecture heading `aria-level` compatibility fix 미변경.
- prose DOM reading order 유지.
- semantic Figure/figcaption 유지.
- 모든 stage에 native button direct access 제공.
- active stage에 `aria-current="step"` 제공.
- color 외 label, geometry, selected state cue 제공.
- reduced motion에서는 같은 state로 즉시 전환.
- WebGL/import/render/context 실패 시 semantic fallback 유지.

Lighthouse Accessibility는 세 benchmark 모두 100이었다.

## 11. Lifecycle와 performance

- `frameloop="demand"` 유지.
- settled idle RAF delta: 세 benchmark 모두 0.
- 보이는 narrative당 active Canvas 최대 1.
- route exit 후 active Canvas 0.
- observer: 96 created / 96 disconnected / 0 active.
- runtime error 0, network error 0.
- 신규 dependency와 package/lockfile 변경 0.

Narrative context가 드러낸 Tokenization `entries`/`widths`, Attention
`groups` derived-reference 재생성은 `useMemo`로 고정했다. Geometry와 numeric
semantics는 바꾸지 않았다.

Lighthouse candidate:

| Chapter | Perf | A11y | Best Practices | SEO | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Tokenization | 85 | 100 | 100 | 100 | 0ms | 0.1524 |
| Embedding | 84 | 100 | 100 | 100 | 0ms | 0.1524 |
| Attention | 83 | 100 | 100 | 100 | 0ms | 0.1524 |

정확한 old-layout baseline 대비 Tokenization/Embedding score는 동일했다.
Attention은 Perf -1, LCP +41ms였고 TBT/CLS 변화는 없었다.

## 12. Before/after screenshot evidence

Evidence root:

```text
.omo/evidence/learn-visual-narrative/browser/
```

동일 viewport 비교:

```text
comparisons/tokenization-before-after-1440x900.png
comparisons/embedding-before-after-1440x900.png
comparisons/attention-before-after-1440x900.png
```

Full Chapter 비교:

```text
comparisons/tokenization-before-after-chapter-1440.png
comparisons/embedding-before-after-chapter-1440.png
comparisons/attention-before-after-chapter-1440.png
```

After evidence는 desktop 14 states, 390x844 mobile 3 states, full-Chapter
3 captures를 포함한다. Root와 `/transformer_viz/` production build를 각각
real Chrome으로 검증했다.

## 13. Independent visual critique

**구체적인 장점**

1. Figure border, inner scroll, bottom status bar 제거가 분명하다.
2. Tokenization은 prose와 visual 결합이 세 benchmark 중 가장 강하다.
3. Embedding desktop split은 설명과 lookup을 동시에 읽게 한다.
4. Embedding selected row/vector의 색 연속성이 관계를 잘 전달한다.
5. Attention은 하나의 stage와 절제된 controls를 사용한다.
6. Mobile width와 inner-scroll 문제가 해결됐다.

**구체적인 문제점**

1. Attention은 state별 silhouette와 density 차이가 커서 빠른 Figure 교체처럼
   느껴질 수 있다.
2. Embedding matrix line, row label, endpoint label이 서로 경쟁한다.
3. Token chips의 datatype identity가 더 강하게 드러날 수 있다.
4. Tokenization/Embedding selector의 visual weight가 아직 다소 강하다.
5. Mobile에서는 prose와 related visual이 동시가 아니라 순차 노출된다.
6. 반복 button/dot/label box가 일부 product-widget 인상을 남긴다.
7. Global fixed Header가 긴 읽기 중 계속 시선을 끈다.

따라서 구현 완료와 자동 gate 통과는 visual 승인과 동일하지 않다.
**User visual approval: PENDING**.

## 14. Tests와 automated gates

실행 결과:

- `scripts/browser_visual_narrative.py` root: PASS.
- 같은 harness `/transformer_viz/` subpath: PASS.
- 6 widths × 3 benchmarks = 18 geometry cases, overflow failure 0.
- normal/fast wheel, click, keyboard, history Back/Forward: PASS.
- sticky Header clearance, section ending, mobile non-sticky: PASS.
- semantic Figure/figcaption, observer cleanup, idle RAF: PASS.
- canonical `docker compose exec -T web ./scripts/check.sh`: PASS.
- general Vitest: 84 files / 597 tests PASS.
- serialized lifecycle Vitest: 1 file / 7 tests PASS.
- root/subpath production build, CSP/assets, Worker/WASM/font: PASS.
- Part 0/1/2, GPT, Block, Lab, Architecture Viewer, Score Matrix,
  Worker/generation browser regression surfaces: PASS.
- `git diff --check`: PASS.

Canonical lint는 exit 0이지만 변경하지 않은
`LearningSceneCanvas.test.tsx:33`, `LearningSceneCanvas.tsx:50`,
`LearningSceneCanvas.tsx:58`의 기존 Biome `useLiteralKeys` fixable suggestion
세 개를 계속 출력한다. 이번 scope 밖이며 suppress하거나 수정하지 않았다.

## 15. Git, scope freeze, expansion stop gates

Local commits:

```text
45cf204 refactor(web): add Learn visual narrative benchmarks
dd89589 test(browser): verify Learn visual narrative flow
docs(learn): define visual narrative reading model
```

Push는 수행하지 않았다.

변경한 Chapter content structure는 정확히 세 개다:

1. 0.2 Tokenization
2. 2.1 Token Embedding
3. 5.1 Self-Attention (요청 benchmark label: 5.0)

나머지 11개 Chapter visual structure는 migration하지 않았다.

확장 전 stop gate:

1. 세 benchmark user visual approval
2. prose와 visual의 하나의 narrative 판정
3. Figure/card/widget 인상 제거 판정
4. Inline/Split/Sticky desktop reading-flow 승인
5. mobile reading-flow 승인
6. accessibility/lifecycle/performance 회귀 없음
7. independent critique 잔여 문제의 수용 또는 수정 결정

현재 1, 2, 3, 4, 5, 7은 사용자 판정이 남았다. 따라서 post-approval
roadmap만 문서화했고 다른 11개 Chapter migration은 시작하지 않는다.
