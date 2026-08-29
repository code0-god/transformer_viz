# transformer_viz — ThreeUI-first Product Migration — Phase 1 최종 보고서

작성일: 2026-08-29

## 1. 최종 결론

Phase 1을 완료했다. `@designcodeio/threeui@1.1.0`은 실제 production
dependency이자 제품 UI의 canonical layer로 동작한다. Global Shell,
navigation/status, Course Home, Learn chrome, Lab, inspection launcher,
focused-viewer chrome가 하나의 neutral ThreeUI-first 시스템으로
통합되었다.

교육 의미를 가진 DOM/SVG/KaTeX Figure, Worker 추론·생성·재생 계약,
DiagramViewport, actual-data R3F Score Matrix는 원래 역할을 유지한다.
Canonical `scripts/check.sh`, root/subpath Chrome, Lighthouse, bundle,
security, lifecycle, visual 검증이 모두 완료되었다.

## 2. 시작점과 브랜치 위생

- 깨끗한 `origin/main`에서 `feat/threeui-first-ui`를 생성했다.
- 기존 uncommitted spike 코드를 가져오지 않았다.
- 최종 브랜치는 `origin/main`보다 9개 commit 앞선다.
- `git status --short`는 비어 있다.
- push는 수행하지 않았다.
- model, tokenizer, Rust crates, Worker source, generated schema,
  nanoGPT submodule에는 변경이 없다.

## 3. ADR와 제품 방향

ADR 0013은 삭제하거나 고쳐 쓰지 않고 spike 결과를 보존했다. 상태만
`Superseded in product direction by ADR 0014`로 명시했다. 54.5MB catalog,
legacy Three aliases, global reset, continuous RAF, iframe/hard-coded demo,
semantic API 부재에 대한 기존 finding은 여전히 유효하다.

ADR 0014는 `Accepted`이며 제품 방향에서 ADR 0013을 supersede한다.
ThreeUI는 product chrome를 소유하고, DOM/SVG/KaTeX와 R3F는 전문
renderer 역할을 유지한다.

## 4. ThreeUI 재감사와 dependency

감사 기준:

```text
@designcodeio/threeui@1.1.0
upstream commit 326580429881c2abe7893bee53c62cbb31b6ee49
@react-three/fiber@9.7.0
three@0.185.1
```

ThreeUI의 `three128`과 `three165` alias는 dependency graph에 남지만
eager production JavaScript에는 들어오지 않는다. 제품 R3F는
`three@0.185.1`을 사용한다. ThreeUI는 `devDependencies`가 아니라
`dependencies`에 정확히 pin되어 있다.

## 5. Component allowlist와 denylist

Production allowlist:

- `LumenCta`: Lab Stop action의 native-button adapter.
- `CircleButtons`: focused-viewer close action의 native-button adapter.

두 component는 package subpath로만 import된다. Product adapter가
Korean label, disabled/type state, aria-label, 44px target, reduced motion,
neutral theme를 소유한다.

`AnimatedTopDock`, `DiagnosticsPanel`, `UplinkLoader`,
`SkeuomorphicToggle`, `PredictiveArcCanvas`, generic iframe/scene,
particle/background export는 hard-coded content, 불완전 state API,
continuous decorative RAF 또는 semantic data 부재 때문에 거부했다.

## 6. Theme와 CSS bridge

ThreeUI neutral instrument 방향을 채택했다. Page, reading plane, surface,
foreground, muted text, accent, status, focus, border, radius, overlay
shadow는 `src/threeui/threeUi.css`의 application-owned token이다.

Korean font stack:

```text
"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo",
ui-sans-serif, system-ui, sans-serif
```

`@designcodeio/threeui/style.css` global import는 test로 금지한다.
Allowlisted subpath의 scoped CSS 다음에 adapter와 component-local CSS가
적용된다. Figure semantic token은 product UI token과 분리되어 있다.

## 7. Global Shell, navigation, status

Desktop shell은 brand, Learn/Lab navigation, Worker status만 남긴 compact
56px row다. Mobile은 96px two-row shell로 전환되며 navigation target은
44px이다. Brand, navigation, status 사이 overlap은 320, 390, 768,
1024, 1440에서 0이다.

Ready/error status는 text와 color를 함께 사용한다. Worker loader failure
시 generic `Model Error`는 assistive label로 유지하고 실제 오류 detail은
화면에 표시한다. 390px에서도 detail이 clipping되지 않고 Generate는
disabled 상태를 유지한다.

## 8. Course Home

Home은 marketing hero나 inference console이 아니라 learning app
entry로 재구성했다.

- 한 개 primary `처음부터 시작` action.
- secondary Lab 및 ToC action.
- 텍스트 → 토큰 → 언어 모델 → Embedding → GPT → Transformer Block →
  Self-Attention의 7단계 sequence.
- decorative WebGL/Canvas 없음.
- 모든 action target 44px.
- 320x568에서 첫 course surface가 y=303.75px에 시작한다.

ThreeUI component를 semantic anchor나 `aria-controls` button 역할에
억지로 사용하지 않았다.

## 9. Learn chrome와 교육 구조

Learn은 Article + Inline Figure 구조를 유지한다.

- Chapter별 H1 하나.
- 17px body, 29.75px line-height.
- content-owned ToC, footer Previous/Next, callout, Figure wrapper.
- Chapter 변경 시 top reset과 focus handoff.
- 같은 Chapter state 변경 시 scroll 유지.
- overlay trigger, permanent sidebar, developer note 없음.

Token과 GPT 비교에서 baseline과 final의 Figure ID, size category,
preferred width, caption, article ownership, keyboard Chapter link가
일치한다.

## 10. Semantic Figure 보존

NLP, Token, Vocabulary, tokenization methods, language model,
next-token, conditional probability, autoregressive generation, Token
Embedding, Position Embedding, Hidden State, GPT root의 12개 Figure를
보존했다.

320, 390, 768, 1024, 1366, 1440의 6개 width에서 총 72 browser probe를
통과했다. Desktop SVG, mobile fallback/mobile-flow, caption, preferred
geometry, article 위치, zero overflow가 유지된다. Figure geometry를
ThreeUI demo로 교체하지 않았다.

## 11. Lab와 shared controls

Lab는 experiment-first hierarchy다.

1. Prompt.
2. Generate/Stop.
3. sampling settings.
4. decoded continuation과 replay.
5. 실제 evidence가 생긴 뒤 inspection launchers.

Prompt, Temperature, Top-K, Mode, Seed는 native semantics를 유지한다.
Stop만 allowlisted ThreeUI action을 사용한다. 390과 320에서 experiment,
primary controls, settings가 모두 single column으로 stack되고 모든
control은 44px 이상이다.

## 12. Overlay, DiagramViewport, Score Matrix

Architecture와 Score Matrix는 하나의 focused-viewer shell을 공유한다.
Dialog label, focus trap/restore, inert background, scroll lock/restore,
44px close action, body-owned scrolling을 보존했다. Mobile overlay는
viewport 전체를 사용한다.

DiagramViewport의 Fit, zoom, pan, ResizeObserver, toolbar semantics는
변경하지 않았다. Score Matrix는 actual Worker trace를 받는 lazy R3F
chunk로 남는다. Canvas 값과 HTML table의 첫 값
`0.15698754787445068`이 정확히 일치한다.

## 13. Worker, generation, replay parity

Baseline과 final:

| 계약 | Baseline | Final |
| --- | ---: | ---: |
| Worker starts | 1 | 1 |
| generation/replay posts | 4 | 4 |
| replay post delta | 1 | 1 |
| Score Matrix requests | 1 | 1 |
| 20회 reopen 뒤 requests | 1 | 1 |

`initialize`, `generate`, `continue_generation`,
`inspect_generation_step` 순서가 유지된다. Request ID, run ID, step
index correlation이 일치한다. Large u64 seed는
`9007199254740991`로 clamp되고 Generate가 다시 enabled/busy=false가
된다. 강제 `postMessage` 실패도 error를 표시하고 pending state를
해제한다.

## 14. Lifecycle, reduced motion, failure isolation

- Score Matrix idle frames: 0.
- 20회 reopen 후 Canvas: 0.
- 20회 reopen 후 dialog: 0.
- WebGL unavailable: renderer request 없이 exact table 표시.
- reduced motion: renderer request 없이 static table 표시.
- renderer chunk failure: local alert와 table 표시.
- WebGL context loss: table open 및 recovery 유지.
- 모든 CSS request 차단: semantic Home, Learn Figure, Lab controls 유지.
- Chrome verifier는 process group 전체를 종료한 뒤 profile을 제거한다.

## 15. Responsive와 accessibility

Product matrix는 320–1440px, Lab overlay matrix는 320–1440px의 6개
viewport를 통과했다. Document/local horizontal overflow는 0이다.

Final Lighthouse accessibility는 Home/Learn/Lab 모두 100이다.
`--ui-text-soft`는 Lighthouse가 발견한 4.14:1 문제를 수정해 white
위 5.00:1, page 위 4.58:1이 되었다. Native controls, heading hierarchy,
visible focus, named table, modal semantics, non-color status cue가 유지된다.

## 16. Legacy CSS retirement

`apps/web/style.css`는 698줄에서 312줄로 줄었다. Global class selector는
47개에서 17개로 줄었고 unreferenced global class는 0개다.

Global Header, navigation, status, Home, Lab intro, Prompt, generation,
settings presentation을 제거했다. Semantic Figure geometry,
architecture, DiagramViewport, Score Matrix, KaTeX, focus, hidden text,
startup/error contract CSS는 유지했다. Compatibility alias는 남기지
않았다.

## 17. Bundle, Lighthouse, performance

| Artifact | Baseline raw | Final raw | Baseline gzip | Final gzip |
| --- | ---: | ---: | ---: | ---: |
| Product CSS | 78,696 B | 94,243 B | 13,114 B | 14,712 B |
| Eager app JS | 285,938 B | 290,650 B | 74,675 B | 75,980 B |
| Eager 합계 | 364,634 B | 384,893 B | 87,789 B | 90,692 B |
| Lazy Score Matrix | 901,491 B | 901,491 B | 234,815 B | 234,815 B |
| Worker WASM | 1,945,143 B | 1,945,143 B | 476,405 B | 476,405 B |

Eager gzip delta는 +2,903 B(+3.31%)다. Lighthouse final category는 세
route 모두 Performance 66, Accessibility 100, Best Practices 100, SEO
100이다. Baseline Performance 71 대비 -5지만 TBT delta 0ms, request
delta 0, LCP delta 최대 +314.1ms, transfer delta +19,977 B다. Severe
performance regression은 없다.

## 18. Release, security, visual evidence

Canonical `scripts/check.sh` 최종 결과는 `All checks passed.`다.

- frozen dependency/toolchain.
- binding freshness.
- 532 web tests.
- rustfmt.
- native/WASM strict Clippy.
- Rust workspace tests, release build, WASM check.
- model/reference checksum과 compiled Worker trust anchor.
- root 및 `/transformer_viz/` static policy.
- Worker redirect/size/error sentinels.
- architecture, learning, hybrid R3F, notation, generation transport,
  Stop/replay browser contracts.

Committed milestone screenshot:

```text
milestone-lab             19
milestone-lab-final       19
milestone-css-retirement  19
milestone-responsive      23
```

최종 visual regression set은 SHA-256으로 고정한 10개 image다.

## 19. Atomic commits, scope, Phase 2

Final report 이전의 verified atomic commit 순서:

```text
2090062 feat(web): establish ThreeUI product foundation
7e25b0b feat(web): migrate shell and course home
74c92aa feat(web): migrate Learn product chrome
b936cb9 feat(web): migrate Lab and runtime surfaces
ca15a1d refactor(web): retire legacy product CSS
734c13f fix(web): harden responsive product surfaces
0a7db76 test(web): expand browser failure benchmarks
b02de95 fix(web): harden release verification
f14850c docs: record ThreeUI Phase 1 verification
```

이 9개 increment와 본 final delivery report commit은 모두 omo
attribution을 포함한다. `VITE_THREEUI_SPIKE`,
`threeui-spike`, `PredictiveArcCanvas`, `DiagnosticsPanel` production
route는 없다. Phase 2는 `docs/THREEUI_PHASE2_PLAN.md`의 planning only다.
Figure 구현, progress persistence, backend, CDN, WebGPU, new tensor scene는
승인하지 않았다.

## 20. 최종 승인 질문 20개

| # | 승인 질문 | 답변 | 근거 |
| ---: | --- | --- | --- |
| 1 | 깨끗한 `origin/main`에서 시작했는가? | YES | 전용 feature worktree/branch |
| 2 | ADR 0013과 spike finding을 보존했는가? | YES | ADR 0013 superseded status 및 원문 |
| 3 | ADR 0014가 제품 방향을 supersede하는가? | YES | ADR 0014 Accepted |
| 4 | ThreeUI를 현재 source/package 기준으로 재감사했는가? | YES | version/source commit과 inventory |
| 5 | ThreeUI가 실제 production dependency인가? | YES | `dependencies` 1.1.0, shipping symbols |
| 6 | Global Shell/Home가 ThreeUI-first인가? | YES | shell/Home code와 final images |
| 7 | Learn chrome와 article 구조를 모두 보존했는가? | YES | 72 Figure probes와 Chapter tests |
| 8 | Lab controls와 inspection flow를 보존했는가? | YES | hands-on Lab workflow |
| 9 | Overlay와 DiagramViewport 동작을 보존했는가? | YES | fit/zoom/pan/focus/scroll contracts |
| 10 | actual-data R3F Score Matrix가 lazy인가? | YES | separate chunk, one request, exact table |
| 11 | CSS/theme bridge와 allowlist/denylist가 tested인가? | YES | ThreeUi/cssRetirement tests |
| 12 | Legacy product CSS를 제거했는가? | YES | 698→312줄, stale selector 0 |
| 13 | Responsive와 Korean typography가 통과했는가? | YES | 320–1440 matrix, 17px Learn body |
| 14 | Accessibility/reduced motion/error isolation이 통과했는가? | YES | Lighthouse 100, failure matrix |
| 15 | Worker/replay/generation parity가 유지되는가? | YES | baseline/final request parity |
| 16 | 20-cycle lifecycle 누수가 없는가? | YES | Canvas/dialog 0, request 1 |
| 17 | Root와 `/transformer_viz/`가 안전한가? | YES | dual static/browser/security PASS |
| 18 | Bundle/Lighthouse/security/visual QA가 완료됐는가? | YES | 각 독립 report와 canonical gate |
| 19 | Phase 2는 계획만 있고 구현은 없는가? | YES | planning-only 문서와 scope audit |
| 20 | Atomic commit 완료, push 미수행, Phase 1 release 가능한가? | YES | 9 verified increments + final report commit, no push |

최종 승인: **20/20 YES**.
