# transformer_viz — ThreeUI-first Visual Integration Pass 최종 보고서

작성일: 2026-08-29

## 1. Visual Audit

### Header

- 기존 underline wordmark와 OS-style segmented control 제거.
- compact application dock, selected face depth, compact status 적용.
- desktop/mobile overlap 0.

### Learn

- neutral app plane와 bright reading plane 분리.
- giant white Figure card 제거.
- Chapter prose와 Figure 의미는 동결.

### Lab

- giant H1과 two-card dashboard 제거.
- MODEL LAB, Prompt, Output, Inspect 순서의 instrument stack 적용.
- Generate가 명확한 ThreeUI primary action.

### Architecture Viewer

- modal chrome와 SVG를 같은 neutral renderer plane에 통합.
- legacy pastel 강도 축소.
- vertical root flow 유지.

### Score Matrix

- beige canvas 제거.
- dark renderer plane, axis labels, zero plane, signed colors, selected rim,
  exact detail, 3D/2D mode 적용.

## 2. ThreeUI Neutralization Audit

기존 override:

```text
Lumen:
box-shadow: none
filter: none
backdrop-filter: none

Circle:
atmosphere/aura/rim/face/details = display: none
```

모두 제거했다. Lumen gradient/depth/ring과 Circle
atmosphere/aura/rim/face/details가 production screenshot에서 보인다.

유지한 override:

- Korean font.
- 44px target.
- native semantics.
- focus-visible.
- neutral hue/saturation/brightness.
- compact geometry.
- reduced motion.
- scoped bridge.

## 3. ThreeUI Component Usage

| Component | Variant | Purpose | Lazy | Motion | Accessibility |
| --- | --- | --- | --- | --- | --- |
| `LumenCta` | primary | Generate | eager/light | hover, press, loading ring | inner native button, disabled, aria-busy bridge |
| `LumenCta` | ghost | Stop/secondary | eager/light | hover, press | inner native button |
| `CircleButtons` | plus rotated close | focused viewer close | eager/light | hover, press | aria-label, 44px |

`RectangleButtons`는 hard-coded English label과 불완전 click/disabled/rich
content API 때문에 채택하지 않았다. package-global CSS도 import하지 않는다.

## 4. Header / Navigation

- Transformer wordmark와 compact Viz face.
- Learn/Lab은 독립 surface와 selected depth 사용.
- Ready/Loading/Error는 text와 dot로 표현.
- loading만 pulse 가능.
- mobile 2-row dock, 44px navigation.

## 5. Lab Redesign

### Prompt

Prompt가 첫 instrument surface다. Textarea와 Lumen Generate가 같은
generation row에 있다.

### Settings

Temperature와 Top-K summary가 보이는 compact disclosure다.

### Generate / Stop

둘 다 `LumenCta` adapter를 사용한다. idle, working, stopping, disabled,
error state를 같은 visual language로 표현한다.

### Output

Prompt/Continuation viewport, token stream, selected token detail, stop reason,
context usage를 한 vertical flow로 배치했다.

### Replay

generation/replay request order와 exact Worker correlation은 기존과 같다.

## 6. Inspection Launcher

기존 4-button grid를 다음 runtime-aware launcher로 교체했다.

```text
01 MODEL         2 blocks · 4 heads
02 BLOCK         Layer 1
03 ATTENTION     Layer 1 · Head 1
04 SCORE MATRIX  Step 1 · Head 1
```

Score Matrix는 replay와 selected step이 없으면 disabled다. 모든 항목은
native button이며 Enter/Space, focus restoration, disabled announcement를
통과한다.

## 7. Architecture Viewer

### Palette

neutral input, subtle representation tint, cool structural surface, restrained
warm normalization, restrained violet output, strong selected accent를 쓴다.

### Nodes

visible node radius는 6–8px다. selected node는 accent stroke와 restrained
drop shadow를 사용한다.

### Connectors

main flow는 neutral thin line, Context Update는 accent dashed line이다.

### Controls

Fit/zoom/pan 의미는 그대로다. toolbar만 ThreeUI face/depth로 변경했다.

Root flow 의미와 node order는 변경하지 않았다.

## 8. Score Matrix Viewer

### Canvas

`#11181b` neutral dark renderer surface와 explicit grid/zero plane을 사용한다.

### Axes

Key와 Query orientation, 첫/마지막 actual token label을 canvas 안에
표시한다. 전체 adaptive position labels는 별도 axis rail에도 유지한다.

### Zero plane

Positive는 위, Negative는 아래다. 색뿐 아니라 signed height와 0 plane
label로 부호를 전달한다.

### Selection

click selection은 persistent다. selected bar는 wire rim, detail panel은
Query, Key, exact Score, Mask를 표시한다.

### Legend

colorblind-safe blue/neutral/amber scale와 actual min/0/max 값을 표시한다.

### 2D fallback

기존 exact HTML table을 user-visible `2D Matrix` mode로 승격했다. WebGL,
reduced motion, import failure, context loss fallback도 같은 table을 쓴다.

## 9. Learn Visual Integration

- Article, prose, Chapter order, Figure IDs, captions 동결.
- H1 scale 완화, eyebrow/H1/abstract/article hierarchy 정리.
- Figure wrapper는 transparent + thin divider.
- Vocabulary banner는 status line으로 축소.
- Tokenization rows는 precise data sheet로 변경.
- Current byte는 selected/current model state 유지.

## 10. Motion / Reduced Motion

허용:

- selected navigation response.
- Lumen hover/press.
- loading-only ring/status pulse.
- inspection hover.
- viewer open.
- selected matrix cell.

금지 상태 유지:

- idle floating.
- decorative continuous RAF.
- article animation.
- auto-rotating camera.

Reduced motion browser probe는 Canvas mount 0, exact table visible을 확인했다.

## 11. Accessibility

Final Lighthouse:

```text
Home  100
Learn 100
Lab   100
```

Native controls, named navigation, heading hierarchy, focus trap/restore,
inert background, disabled Score state, keyboard inspection, exact table,
non-color state cue를 모두 유지한다.

## 12. Responsive QA

검증 viewport:

```text
320×568
390×844
768×1024
1024×768
1366×768
1440×900
```

Home, Vocabulary, Tokenization, Lab, Architecture Viewer, Score Matrix에서
required 390/1024/1366/1440 coverage를 통과했다. horizontal overflow는
0이다.

## 13. Performance / Bundle

Final Lighthouse:

| Surface | Performance | TBT | CLS | Requests |
| --- | ---: | ---: | ---: | ---: |
| Home | 65 | 0ms | 0.000208 | 13 |
| Learn | 65 | 0ms | 0.000208 | 13 |
| Lab | 65 | 0ms | 0.000254 | 13 |

Bundle:

| Artifact | Baseline gzip | Final gzip | Delta |
| --- | ---: | ---: | ---: |
| Product CSS | 14,712 B | 17,628 B | +2,916 B |
| Eager app JS | 75,980 B | 77,494 B | +1,514 B |
| Eager total | 90,692 B | 95,122 B | +4,430 B |
| Lazy Score Matrix | 234,815 B | 235,156 B | +341 B |

TBT, request count, Worker payload, idle RAF는 증가하지 않았다.

## 14. Tests / Builds

Canonical Docker `scripts/check.sh`:

```text
Test Files 70 passed
Tests 543 passed
All checks passed.
```

포함:

- web lint/typecheck/test/build.
- Rust fmt/strict Clippy/tests/release/WASM.
- root와 `/transformer_viz/` builds.
- Worker integrity/security.
- Chapter scroll/focus.
- overlay focus/scroll restoration.
- generation transport, bytes, Stop, replay.
- Architecture navigation.
- SVG/R3F browser contracts.
- failure isolation.
- 20-cycle lifecycle.

## 15. Screenshots

Baseline: 26 screenshots.
Final browser evidence: 39 screenshots.

Required final set:

```text
01-home-1440.png
02-learn-vocabulary-1440.png
03-learn-tokenization-1440.png
04-lab-1440.png
05-lab-architecture-viewer-1440.png
06-lab-score-matrix-1440.png
07-home-390.png
08-learn-vocabulary-390.png
09-lab-390.png
10-score-matrix-390.png
```

Same-viewport comparison:

```text
comparison/lab-before-after.png
comparison/architecture-before-after.png
comparison/score-matrix-before-after.png
```

## 16. Deferred

이번 pass에서 구현하지 않았다.

- Figure Phase 2.
- Q/K/V visualization.
- Scale visualization.
- Mask visualization.
- Softmax visualization.
- Encoder–Decoder.
- new model/tokenizer.
- new R3F scene.
- Worker/routing architecture change.

## 17. Git

Canonical checkout:

```text
/Users/zerogod/Projects/transformer_viz
branch feat/threeui-first-ui
```

별도 worktree는 제거했다. 이전 dirty spike는 다음 stash에 보존했다.

```text
stash@{0}: preserve spike/threeui-adoption before ThreeUI visual integration
```

Verified increments:

```text
3cb622e refactor(web): restore ThreeUI visual language
f666b82 refactor(web): integrate ThreeUI reading surfaces
8cc7785 refactor(web): redesign model lab with ThreeUI
d441eb2 refactor(web): integrate architecture viewer styling
1ed7871 refactor(web): redesign score matrix viewer
df557b6 test(web): verify ThreeUI visual integration
2617c3d docs(web): document ThreeUI product language
```

모든 commit은 omo attribution을 포함한다. 이 보고서는 별도 final report
commit으로 추가된다. push 후 exact remote SHA는 delivery response에서
검증한다.

### 최종 승인 질문

| # | 질문 | 답변 |
| ---: | --- | --- |
| 1 | 실제 화면이 ThreeUI-first로 느껴지는가? | YES |
| 2 | ThreeUI 효과를 기존 CSS가 다시 없애지 않는가? | YES |
| 3 | controls가 한 visual system으로 통일됐는가? | YES |
| 4 | Lab이 전문적인 interactive instrument처럼 보이는가? | YES |
| 5 | Generate/Stop이 같은 system인가? | YES |
| 6 | Inspection이 단순 button grid가 아닌가? | YES |
| 7 | runtime state가 inspection UI에 자연스럽게 나타나는가? | YES |
| 8 | Viewer shell과 SVG가 하나의 제품처럼 보이는가? | YES |
| 9 | main flow semantic은 그대로인가? | YES |
| 10 | legacy pastel 느낌이 줄었는가? | YES |
| 11 | 3D scene 의미가 처음부터 읽히는가? | YES |
| 12 | Query/Key가 명확한가? | YES |
| 13 | zero/positive/negative가 명확한가? | YES |
| 14 | selected cell 값을 읽기 쉬운가? | YES |
| 15 | R3F가 decoration이 아니라 data visualization인가? | YES |
| 16 | accessibility를 유지했는가? | YES |
| 17 | reduced motion을 유지했는가? | YES |
| 18 | mobile을 유지했는가? | YES |
| 19 | lazy loading을 유지했는가? | YES |
| 20 | Worker/numerical semantics를 유지했는가? | YES |

최종 승인: **20/20 YES**.
