# transformer_viz — ThreeUI-first Boundary / Layout System Pass

작성일: 2026-08-29

## 1. Boundary Audit

변경 전에는 같은 페이지 안에서 다음 좌표가 독립적으로 사용됐다.

- Global shell: 최대 90rem과 route별 padding.
- Home: 최대 76rem.
- Lab: 최대 72rem card.
- Chapter header/footer: 최대 56rem.
- Article prose: 52rem.
- Figure: 52/64/72rem.
- Overlay: viewer 자체 좌표.

경계도 각 component의 border에 묶여 Header, Chapter, Article, Figure,
Lab의 시작점과 끝점이 달랐다. Home에는 desktop `translate: -0.5rem`도
남아 있었다.

최종 구조는 텍스트와 component preferred width를 유지하면서 모든 주요
구조선을 해당 application/viewer edge에 맞춘다.

## 2. Canonical Grid

`apps/web/src/layout/pageLayout.css`에 named-line grid를 추가했다.

```text
[full-start]
  gutter
  [wide-start]
    breakout
    [content-start]
      CONTENT
    [content-end]
    breakout
  [wide-end]
  gutter
[full-end]
```

역할:

- `FULL`: application 또는 viewer 전체 edge.
- `WIDE`: Header, Home, Lab, Figure, renderer 작업 영역.
- `CONTENT`: Chapter title, prose, caption, footer navigation.

Content 최대 폭은 52rem이다. Wide 최대 폭은 90rem이며 Home 80rem,
Lab 72rem, Figure 52/64/72rem preferred width는 내부에서 유지한다.

`100vw`, `100dvw`, negative margin breakout은 사용하지 않는다.

## 3. Structural / Content / Internal Divider

새 token:

```text
--boundary-width: 1px
--boundary-structural
--boundary-content
--boundary-internal
--figure-connector
```

`PageDivider`는 `structural`, `content`, `internal` 역할과
`data-boundary-id`를 노출한다.

Structural 적용:

- Global Header.
- Home final boundary.
- Chapter header.
- Article/footer transition.
- Lab header/Prompt, Prompt/Output, Output/Runtime, Runtime/Inspect.
- Focused Viewer header/body.

Content boundary는 prose 내부의 실제 논리 전환에만 사용한다. Table,
launcher row, caption, viewer controls는 internal boundary를 사용한다.

## 4. Removed Decorative Lines

제거:

- Learn Figure outer top/bottom rules.
- active section의 짧은 hanging vertical line.
- callout의 2px colored left rule.
- article reading plane의 양쪽 outline.
- Home desktop translate offset.
- component width에 묶였던 Header, Chapter, footer, Lab structural borders.

전체 production CSS audit 결과:

```text
arbitrary 50px/80px line: 0
hr selector: 0
heading/title pseudo divider: 0
2px/3px UI boundary: 0
```

Header selected underline은 현재 navigation state이므로 유지했다.
Score Matrix zero marker와 SVG strokes는 data/connector semantics이므로 UI
divider로 분류하지 않는다.

## 5. Vertical Boundary Rules

Production CSS의 지속적인 UI vertical boundary는 다음 두 경우뿐이다.

- Score Matrix selected detail의 실제 grid column edge.
- Startup shell의 실제 two-column edge.

둘 다 실제 column boundary다. Score Matrix edge는 1px internal token으로
통일했다.

Figure와 Architecture의 화살표는 `__path`, `architecture-flow` 등의
semantic connector class를 유지한다. Part 0/1/2 connector는
`--figure-connector`를 사용하며 UI boundary token을 사용하지 않는다.

## 6. Home

- Hero와 curriculum surface를 하나의 76rem preferred WIDE composition에
  배치했다.
- Desktop top baseline 차이는 browser geometry 기준 1px 이하이다.
- 후속 editorial composition에서 Home content 폭을 80rem으로 조정했다.
- 임의 `translate: -0.5rem`을 제거했다.
- Lower structural divider는 application edge 전체를 사용한다.
- Mobile에서는 hero와 curriculum이 같은 16px gutter에 정렬된다.

## 7. Learn

검증 Chapter:

```text
0.1
0.2
0.3
0.4
GPT (3.1)
```

각 Chapter에서 다음 x-coordinate를 browser로 비교했다.

- Chapter title.
- 첫 prose.
- Figure.
- caption.
- article final divider.
- footer navigation.

Title, prose, caption, footer는 CONTENT start에서 오차 1px 이하로 일치한다.
Figure는 registry의 prose/wide/full preferred bounds를 유지한다.
Chapter와 article final divider는 FULL이다.

Curriculum content, prose, Figure ID, SVG geometry는 변경하지 않았다.

## 8. Lab

Lab outer card border를 구조 경계로 사용하지 않는다. Background tone만
유지하고 다음 FULL separator를 사용한다.

```text
MODEL LAB
──────────────── FULL
Prompt
──────────────── FULL
Output
──────────────── FULL
Runtime
──────────────── FULL
Inspect
```

Prompt, Output, Runtime, Inspect의 실제 instrument content는 기존 72rem
maximum을 유지한다. Generate/Stop, settings, replay, Worker request,
inspection launcher semantics는 변경하지 않았다.

Desktop/mobile browser workflow에서 Prompt와 Output은 같은 left/right
bounds와 vertical order를 유지했다.

## 9. Viewer

Focused Viewer는 다음 row grid를 사용한다.

```text
header
1px structural divider
scrollable body
```

Overlay divider는 viewer inner edge 전체를 사용한다. Architecture의 meta,
surface, controls, caption과 Score Matrix의 header, renderer, detail,
legend/table은 같은 viewer content grid에 정렬한다.

Architecture SVG geometry와 Score Matrix R3F scene/numeric semantics는
변경하지 않았다.

## 10. Geometry Tests

새 production-browser gate:

```text
scripts/browser_boundary_layout.py
```

검증 boundary:

- `global-header`
- `home-final`
- `chapter-header`
- `article-final`
- `lab-prompt`
- `lab-output`
- `lab-runtime`
- `lab-inspect`
- `overlay-header`

각 structural divider는 다음을 만족한다.

```text
left  = canonical scope left ±1px
right = canonical scope right ±1px
height = 1px
kind = structural
```

최종 결과:

```text
Boundary layout browser geometry: PASS (6 viewports)
```

## 11. Responsive

검증:

```text
320×568
390×844
768×1024
1024×768
1366×768
1440×900
```

320px 예:

```text
FULL    0 → 320
gutter  16px
CONTENT 288px
scrollWidth = clientWidth = 320
```

모든 viewport의 Home, Learn, Lab에서:

```text
document.documentElement.scrollWidth
===
document.documentElement.clientWidth
```

Header/navigation overlap 0, minimum control height 44px, Learn body 17px를
유지했다.

## 12. Screenshots

Baseline:

```text
.omo/evidence/boundary-layout-pass/before/
39 screenshots
```

Final:

```text
.omo/evidence/boundary-layout-pass/final/
39 screenshots
```

요청 surface:

```text
01-home-1440.png
learn-token-0-2-inline-1440x900.png
02-learn-vocabulary-1440.png
learn-gpt-inline-1440x900.png
04-lab-1440.png
05-lab-architecture-viewer-1440.png
06-lab-score-matrix-1440.png
08-learn-vocabulary-390.png
09-lab-390.png
```

Final browser evidence:

```text
.omo/evidence/boundary-layout-pass/final-browser.json
Hybrid browser foundation: PASS (39 screenshots)
```

## 13. Tests

Focused:

```text
PageLayout
Header
CourseHome
Curriculum shell
4 files / 9 tests PASS
```

추가 검증:

- TypeScript strict typecheck.
- Biome lint.
- Python browser verifier compilation.
- Impeccable layout detector: 0 findings.
- Six-viewport geometry.
- Full browser generation/Architecture/Score Matrix/failure/lifecycle contract.
- Root and `/transformer_viz/` production builds.
- Complete web/Rust/WASM/security gate.

Canonical web suite:

```text
Test Files 71 passed
Tests 545 passed
All checks passed.
```

## 14. Git

작업 시작:

```text
branch: feat/threeui-first-ui
local:  e548728d364925a7d90ecf7434fd794bf0836cc8
origin: e548728d364925a7d90ecf7434fd794bf0836cc8
```

별도 worktree를 만들지 않았다. 작업 경로:

```text
/Users/zerogod/Projects/transformer_viz
```

이번 요청에는 commit/push 지시가 없으므로 commit과 push를 수행하지
않았다. 변경은 target branch working tree에 남아 있다.

최종 승인:

| # | 질문 | 답변 |
| ---: | --- | --- |
| 1 | 주요 가로 구조선이 동일한 full-width 규칙을 따르는가? | YES |
| 2 | 텍스트 column과 divider column 역할이 명확한가? | YES |
| 3 | 임의 길이 decorative line이 거의 사라졌는가? | YES |
| 4 | 세로선은 실제 column 경계에만 있는가? | YES |
| 5 | Figure connector와 UI boundary가 구분되는가? | YES |
| 6 | Home/Learn/Lab/Viewer가 동일 system을 사용하는가? | YES |
| 7 | 모바일에서도 정렬이 유지되는가? | YES |
| 8 | Horizontal overflow가 없는가? | YES |
| 9 | ThreeUI character를 훼손하지 않는가? | YES |

최종 승인: **9/9 YES**.
