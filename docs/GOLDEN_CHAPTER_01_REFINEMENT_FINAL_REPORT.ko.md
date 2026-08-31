# Golden Chapter 0.1 Refinement 최종 보고서

## 상태

- Implementation: COMPLETE
- Automated: PASS
- Independent visual critique: PASS
- User visual approval: PENDING
- Chapter 0.2 이후 visual migration: 수행하지 않음

## 1. Layout Problem

기존 Golden 0.1의 첫 beat는 두 column을 모두 차지했지만 나머지 beat는
LEFT/RIGHT split을 사용했다. 1024px에서 첫 설명 폭은 832px, 이후 설명
폭은 약 330px였다. Active beat의 왼쪽 accent line도 상태 표시인지 divider
인지 불명확했다.

Numeric visual은 `2×3 cells × 4 groups`, 총 24 cells라서 phrase/token별
matrix처럼 읽힐 가능성이 있었다.

## 2. Canonical Left/Right Grid

- max width: 1152px
- LEFT / RIGHT: 38 / 62
- gap: `clamp(56px, 5vw, 72px)`
- scroll owner: document
- spatial pattern: one `sticky-aside`

모든 beat가 같은 named grid lines를 사용한다. 첫 beat도 두 column을
span하지 않는다.

## 3. Beat Alignment

LANGUAGE, NUMERIC, TRANSFORM, RESULT, TOKEN_PREVIEW 모두:

- explanation left/width drift: 0px
- visual left/width drift: 0px
- sentence/field/result/token center drift: 1px 이하

1024, 1366, 1440 desktop records 15건으로 검증했다.

## 4. Numerical Representation

### Before

- 독립적으로 보이는 4개 group
- group당 6 cells
- 총 24 cells
- phrase/token mapping처럼 읽힐 위험

### After

- 하나의 persistent numerical field
- desktop: 2×8, 16 cells
- mobile: 같은 16 DOM nodes 중 12개를 2×6으로 표시
- group count: 0
- visible label: `계산 가능한 숫자 표현`

0.1은 여러 숫자가 하나의 계산 가능한 표현을 이룬다는 직관만 가르친다.

## 5. Transformation Continuity

NUMERIC과 TRANSFORM:

- field: 508.89×78.78px
- cell: 56.61×35.38px
- same rows, columns, count, anchor
- same React/DOM objects

TRANSFORM은 fill, border emphasis, SVG relationship lines만 바꾼다.
Geometry animation이나 새로운 matrix는 없다.

## 6. Vertical Divider Decision

제거했다.

Golden beat의 `::before`는 `content: none`이다. LEFT/RIGHT 구분은 spacing과
grid만 담당한다. Current screenshots에 accent divider가 없다.

## 7. Mobile Stack

DOM source order:

```text
first explanation
persistent visual
remaining explanations
```

- visual width: 288px at 320, 358px at 390
- visual height: 232px at 320, 약 281px at 390
- visible field: one 2×6 field
- active prose gap: 15.59–36.80px
- 320 active prose bottom clearance: 32.61–33.22px
- overflow/collision: 0

Non-Golden VisualNarrative observer behavior는 기존 50% 기준을 유지한다.

## 8. Geometry Measurements

| Viewport | LEFT | Gap | RIGHT |
| ---: | ---: | ---: | ---: |
| 1024 | 342.69px | 56.00px | 559.11px |
| 1366 | 411.80px | 68.30px | 671.91px |
| 1440 | 410.39px | 72.00px | 669.61px |

모든 beat의 coordinate delta는 1px 이하, 실제 측정값은 0px였다.

## 9. Whitespace Audit

Beat minimum height를 `30vh`, 최대 240px로 줄였다. Desktop full Chapter:

- before: 1440×2460
- after: 1440×1912
- vertical reduction: 548px

Mobile full Chapter:

- before: 390×2722
- after: 390×2354
- vertical reduction: 368px

Figure가 작아서 생긴 빈 공간을 줄였지만 continuous-scroll breathing room은
유지했다.

## 10. Before/After Screenshots

```text
.omo/evidence/golden-chapter-01-refinement/browser/
```

- `13-before-after-numeric.png`
- `14-before-after-transform.png`
- `15-before-after-result.png`

동일 1440×900 비교에서 similarity는 92, diff는 7.73–8.30%였다. Hotspot은
divider 제거, unified field, fixed Transform geometry, compact Result에
집중된다.

## 11. Full Chapter Screenshot

- `06-full-chapter-desktop.png`
- `07-full-chapter-mobile.png`

Header와 section heading은 CONTENT grid를 유지한다. Narrative만 WIDE
grid를 사용하고 끝난 뒤 핵심 정리·용어 정리는 CONTENT width로 복귀한다.

## 12. Independent Visual Critique

Review 과정에서 재현·수정:

- mobile sticky visual 아래 active prose occlusion
- 320×568 active prose bottom clipping
- Result 내부 label/sentence/field spacing
- malformed accessible quotation
- mixed `tokenizer` / `Chapter` visible copy
- non-Golden observer activation behavior leak
- evidence selector와 viewport-relative geometry flaw

최종 fresh 25-image set:

- reviewer A: PASS, confidence 0.97
- reviewer B: PASS, confidence 0.99
- blockers: 0

두 reviewer 모두 one-field identity, CJK precision, grid stability, mobile
prose visibility, Result/Token continuity를 확인했다.

## 13. Tests

PASS:

- focused Vitest: 3 files / 22 tests
- full Vitest: 85 files / 598 tests
- serialized lifecycle: 1 file / 7 tests
- lint / typecheck / production build
- Rust fmt / clippy native+WASM / workspace tests
- root and `/transformer_viz/` production builds
- root/subpath Golden browser contracts
- canonical `./scripts/check.sh`
- 15 desktop geometry records
- 10 mobile state geometry records
- keyboard, reduced motion, navigation, observer cleanup
- runtime/network/console errors: 0

변경하지 않은 `LearningSceneCanvas`의 기존 Biome info 3건은 exit code 0이며
이번 scope에서 수정하지 않았다.

## 14. Git

권장된 작은 refinement 단위로 local commit한다:

```text
refactor(learn): align Golden Chapter narrative grid
test(learn): lock Golden Chapter geometry
docs(learn): record Golden refinement evidence
```

Remote push와 main merge는 수행하지 않는다.

## 15. User visual approval

```text
PENDING
```

Implementation, automated verification, independent critique는 완료됐다.
사용자 visual approval 전 Chapter 0.2 이후 migration은 금지한다.
