# Golden Chapter 0.1 최종 보고서

> Status: SUPERSEDED
>
> 이 문서는 최초 Golden 구현 시점의 기록이다. Canonical grid와 unified
> numerical field를 포함한 현재 contract는
> `GOLDEN_CHAPTER_01_REFINEMENT_FINAL_REPORT.ko.md`가 대체한다.

## 상태

- Implementation: COMPLETE
- Automated: PASS
- Independent visual QA: PASS
- Visual: USER REVIEW REQUIRED
- User visual approval: PENDING
- Chapter 0.2 이후 추가 migration: 금지

## 1. Previous 0.1 Problems

기존 0.1은 언어, 숫자 표현, 모델 계산, 결과를 서로 다른 네 object로
표현했다. Tinted Canvas, generic slab/cube, black computation box, generic
result rectangle, 01–04 rail, 큰 replay button이 하나의 Figure widget을
만들었다.

학습자는 본문을 읽다가 Figure 사용법을 해석하고 다시 본문으로 돌아와야
했다. 그림은 흐름을 설명하지 않고 이미 완성된 pipeline을 보여줬다.

## 2. New Learning Narrative

하나의 실제 문장을 다섯 semantic state가 공유한다.

```text
LANGUAGE
NUMERIC
TRANSFORM
RESULT
TOKEN_PREVIEW
```

State마다 새 scene을 띄우지 않는다. 같은 sentence node와 cell nodes가
계속 남아 appearance, emphasis, position, relation만 바뀐다.

## 3. Beat 1 — Language

Hero sentence:

```text
오늘 영화 정말 재미있었어요.
```

문장은 plain DOM text다. Box, quote card, chip, cube가 없다. 사람이 언어를
읽고 뜻을 이해한다는 첫 학습 목표를 typography만으로 시작한다.

## 4. Beat 2 — Numerical Representation

같은 문장 아래에 phrase별 conceptual cells가 나타난다. Cell은 여러 숫자가
모인 표현이라는 구조만 전달한다.

- 실제 숫자값 없음
- 가짜 소수값 없음
- `개념적 숫자 표현` 표시
- 문장과 cell group의 spatial relation 유지

## 5. Beat 3 — Model Transformation

모델을 black box로 그리지 않는다. 같은 cells가 위아래로 이동하고 강조색과
관계선이 바뀐다.

사용자는 `물체가 모델을 통과했다`보다 `표현 내부 관계와 강조가 계산으로
바뀐다`를 보게 된다. Desktop과 mobile 모두 같은 nodes를 사용한다.

## 6. Beat 4 — Human-usable Result

변환된 cells와 원문을 남긴 채 semantic result를 보여준다.

```text
이 문장의 분위기  긍정
```

Secondary range는 NLP가 감정 분류만 뜻하지 않도록 다음을 함께 보여준다.

- 분류
- 질문 답변
- 번역
- 글 생성

## 7. Token Chapter Handoff

마지막 state는 Result 뒤에 다섯 번째 pipeline node를 추가하지 않는다.
시선을 원문으로 되돌리고 phrase boundary를 표시한다.

```text
개념적 경계 · 실제 경계는 tokenizer에 따라 달라집니다.
```

Footer의 실제 `Token이란? →` link를 클릭해 Chapter 0.2로 이동하고 H1 focus가
복원되는 것까지 real Chrome으로 확인했다.

## 8. Visual Object Continuity

Object permanence contract:

```text
APPEAR
TRANSFORM
EMPHASIZE
REUSE
```

Browser contract가 첫 sentence와 cells에 identity marker를 부여한 뒤 다섯
state를 모두 통과한다. Marker가 유지되므로 remount나 object replacement가
없다. State별 visual height 차이는 1px 이하다.

## 9. Renderer Usage

### DOM

Sentence, state label, semantic result, task range, tokenizer note, accessible
summary를 담당한다.

### SVG

Transform state의 얇은 relationship curves만 담당한다. Arrow pipeline이나
generic node는 없다.

### R3F

사용하지 않는다. 0.1에는 spatial Canvas가 필요한 trace-backed 숫자값이
없다. 기존 R3F runtime과 SceneFigure lifecycle은 다른 Chapter에서 그대로
유지된다.

## 10. Motion

- 일반 transition: 320–720ms
- transform, opacity, filter, SVG stroke만 변경
- autoplay 없음
- idle animation 없음
- scroll snap/lock/hijack 없음
- 정상 document scroll이 beat를 활성화
- `09-language-numeric-mid.png`, `10-numeric-transform-mid.png`로 중간 frame
  확인
- reduced motion: 모든 state transition 1ms 이하

## 11. Removed Figure Chrome

제거:

- visible Figure title
- visible Figure description
- caption divider
- tinted Canvas panel
- border/radius/shadow
- 01–04 step rail
- 큰 replay CTA
- scene status footer
- generic boxes/cubes/arrows

Semantic `figure`와 `figcaption`은 유지한다. Keyboard 사용자가 rail에 focus한
동안에만 작은 native control strip이 나타난다.

## 12. Mobile

Narrow layout은 source-order block flow다.

```text
first beat
visual
remaining beats
```

Visual은 compact sticky object로 남아 읽는 동안 같은 object를 유지한다.

- 320px visual height: 288px
- 390px visual height: 약 304px
- 320/390에서 다섯 state geometry 10건 검증
- label/sentence/cells/result overlap 0
- document/local overflow 0
- mobile cell은 group당 4개만 표시해 legibility 유지

## 13. Accessibility

- 본문만으로 전체 개념 이해 가능
- `role="img"`에 state별 semantic description 제공
- five-state ordered fallback 상시 mount
- 현재 summary에 `aria-current="step"`
- native button keyboard/focus/Enter/Space 지원
- focus rail 44px target
- reduced-motion complete states 유지
- color 외 position, relation, copy, boundary cue 제공
- Canvas-only 정보 없음

## 14. Performance

- settled pending RAF: 0
- Canvas: 0
- SceneFigure: 0
- active observer after route exit: 0
- observer created/disconnected: 4/4
- runtime/network errors: 0
- 신규 dependency: 0
- package/lockfile 변경: 0

작업 시작 artifact 대비:

- main JS: 358,590B → 354,907B, `-3,683B`
- main CSS: 130,859B → 139,241B, `+8,382B`
- old NLP lazy scene chunk 2,169B 제거

## 15. Before/After

Evidence root:

```text
.omo/evidence/golden-chapter-01/browser/
```

주요 파일:

```text
00-before-figure.png
01-language-state.png
02-numeric-state.png
03-transform-state.png
04-result-state.png
05-token-preview.png
06-full-chapter-desktop.png
07-full-chapter-mobile.png
08-before-after.png
```

동일 1440×900 diff는 28.56% pixel change, similarity 71/100이다. Baseline이
anti-reference이므로 큰 중앙 diff는 기존 panel/rail/pipeline 제거를 뜻한다.

## 16. Visual Critique

Independent review에서 처음 발견한 문제:

- period 앞 잘못된 간격
- LANGUAGE에서만 발생한 horizontal jump
- 작은 secondary annotations
- 약한 mobile transform 관계선
- mobile source-order 오류
- mobile Result label/sentence/cells collision
- Token Preview ghost cell label

모두 수정하고 fresh root/subpath evidence로 다시 검토했다. 최종 두 visual
reviewer는 PASS, blockers 없음으로 판정했다.

유지할 장점:

- 문장과 cells의 실제 object permanence
- panel보다 prose/visual relation이 우선
- fake value 없는 honest numeric primitive
- semantic Result
- tokenizer truth를 침범하지 않는 handoff
- Korean glyph와 line break 정상

남은 사용자 판단:

- 넓은 whitespace가 학습 rhythm에 적합한지
- sticky progression의 실제 읽는 느낌이 만족스러운지
- 이 Chapter를 전체 Learn 기준으로 승인할지

따라서 visual QA PASS는 사용자 visual approval이 아니다.

## 17. Tests

PASS:

- focused Golden tests
- Vitest general: 84 files / 597 tests
- serialized lifecycle: 1 file / 7 tests
- lint
- typecheck
- production build
- Rust fmt
- Rust clippy native/WASM
- Rust workspace tests
- Worker integrity/generation regressions
- Learning Workspace browser regression
- Golden browser root and `/transformer_viz/`
- six viewport matrix: 320, 390, 768, 1024, 1366, 1440
- keyboard, wheel, reduced motion, navigation, observer cleanup
- canonical `./scripts/check.sh`

Canonical lint는 변경하지 않은 `LearningSceneCanvas` 파일의 기존
`useLiteralKeys` info 세 건을 계속 출력하지만 exit code는 0이다.

## 18. Git

Local commits:

```text
9977cf5 refactor(learn): rebuild NLP chapter narrative
f6f3a4a test(learn): verify NLP narrative flow
docs(learn): define Golden Chapter visual language
docs(learn): align Golden storyboard registry
```

Push와 main merge는 수행하지 않는다.

## 19. User visual approval

```text
PENDING
```

Automated implementation과 independent visual QA는 완료됐다. 0.1 사용자
visual approval 전에는 Chapter 0.2, Vocabulary, Embedding, Attention 또는
나머지 Learn Chapter를 추가 migration하지 않는다.
