# Learn Visual Experience Reboot 최종 보고서

## 1. 최종 결론

`feat/learn-visual-reboot`는 14개 Learn Chapter를 하나의 ThreeUI-first
interactive visual textbook으로 통합했다. Part 0부터 Self-Attention까지
모든 canonical Chapter가 primary Figure를 가지며, production browser,
root/subpath, lifecycle, Worker, Rust, accessibility, bundle, Lighthouse,
canonical gate를 통과했다.

## 2. 작업 기준과 범위

- 작업 경로: `/Users/zerogod/Projects/transformer_viz`
- 브랜치: `feat/learn-visual-reboot`
- 기준 commit: `76e16bf46dd9ae8684b276c515048ca55e9352a9`
- 본문/Worker/Score Matrix numeric semantics: 보존
- 신규 외부 model, texture, postprocessing dependency: 없음

## 3. 제품 방향

Learn의 최종 제품 공식은 다음과 같다.

```text
Article + Interactive Visual Learning Experience
```

Three.js는 장식이 아니라 selection, transformation, tensor structure,
sequence growth, pipeline, residual, attention 관계를 설명할 때만
사용한다. Canvas는 unique learning content를 소유하지 않는다.

## 4. Storyboard와 정보 구조

`docs/LEARN_VISUAL_STORYBOARD.md`에 구현 전 14-Chapter storyboard를
고정했다. 최종 spine은 `4 + 4 + 3 + 1 + 1 + 1`이다.

- Part 0: representation / segmentation / addressing
- Part 1: prediction / probability / generation
- Part 2: lookup / composition / evolution
- GPT: pipeline
- Transformer Block: residual
- Self-Attention: aggregation

## 5. Shared Learning Scene Foundation

`SceneFigure`는 다음을 공통 소유한다.

- 480px nearby lazy preload와 실제 viewport visible mount
- offscreen unmount
- `frameloop="demand"`
- reduced motion
- WebGL/import/render/context failure isolation
- semantic DOM/SVG fallback
- desktop/mobile viewport mode
- lifecycle, context, RAF, observer instrumentation

`LearningSceneCanvas`는 DPR 1–1.5, no shadows, no postprocessing,
stable document event source를 사용한다.

## 6. Part 0 결과

- 0.1 NLP: text → representation → computation → result
- 0.2 Token: sentence strip segmentation
- 0.3 Vocabulary: token → indexed slot → Token ID
- 0.4 Tokenization: same text, changed segmentation modes

Part 0 첫 Chapter부터 visual product identity가 시작된다.

## 7. Part 1 결과

- 1.1 context → model → candidate fan-out
- 1.2 logit → probability → selection
- 1.3 conditioned prefix accumulation
- 1.4 select → append → updated-context loop

`logit ≠ probability`, `model ≠ sampler`, one-step prediction과
autoregressive generation의 차이를 보존했다.

## 8. Part 2 결과

- Token Embedding: selected row extraction
- Position Embedding: channel-aligned element-wise addition
- Hidden State: 동일 `[T,C]` geometry, value-only evolution

기존 dark-canvas cube prototype보다 stage utilization, label integration,
mobile readability가 개선되었다.

## 9. GPT flagship

다음 전체 generation path를 한 scene에 구현했다.

```text
Input Context
→ Token / Learned Position lookup
→ X₀ element-wise add
→ Block stack × 2
→ Final Norm / Head / Logits
→ Selected Token
→ Updated Context
```

## 10. Transformer Block flagship

정확한 Pre-LN 경로를 보존했다.

```text
X_in → LN₁ → Attention → Add → LN₂ → MLP → Add → X_out
```

두 residual bypass는 depth로 분리되고 merge point가 명확하다.

## 11. Self-Attention flagship

다음 progressive stage를 구현했다.

```text
Q/K/V → QKᵀ/√D → Causal Mask → Softmax
→ Weighted V → Head Merge → Output Projection
```

mask-before-Softmax, normalized positive weights, `Y = AV`를 유지했다.

## 12. ThreeUI-first visual language

- cool neutral computation stage
- restrained semantic color
- crisp DOM labels
- compact ThreeUI controls below stage
- no giant black Canvas
- no generic cube demo
- no particles, bloom, texture, external model
- Chapter별 distinct spatial grammar

## 13. Responsive와 mobile overflow

검증 viewport: 320, 390, 768, 1024, 1366, 1440.

기존 GPT mobile control defect:

```text
button width: 71.6px
scrollWidth: 84px
local overflow: 12px
```

최종 one-line production fix:

```css
overflow-wrap: anywhere;
```

결과:

- 320/390 local overflow: 0
- document horizontal overflow: 0
- target minimum: 54.5px height
- adjacent overlap: 0
- mobile 최대 2줄
- 768–1440 single-line 유지
- pre/post visual semantics 동일

이 fix는 `1932a35` standalone commit이다.

## 14. Accessibility와 heading hierarchy

모든 scene은 title, description, caption, conclusion, native controls,
semantic fallback을 가진다. Architecture route의 native H3/H4와 CSS는
jsdom CSSOM compatibility 때문에 유지했다.

문제가 있는 route Guide에만 최소 적용했다.

```html
<h3 aria-level="2">
<h4 aria-level="3">
```

- redundant `role="heading"`: 없음
- Chrome AX tree: level 1 → 2 → 3
- matrix: 3 routes × 5 viewports × root/subpath PASS
- computed style difference: 0
- Lighthouse screenshot changed pixels: 0
- GPT/Block/Attention accessibility: 100
- heading-order audit: PASS

장기적으로 jsdom/CSSOM blocker 제거 후 native H2/H3로 정리한다.

## 15. Lifecycle와 context recovery

- 20 visibility cycles
- mount delta: 20
- unmount delta: 20
- peak Canvas: 1
- final active Canvas: 0
- final WebGL contexts: 0
- offscreen idle RAF delta: 0
- observer/listener leak: 없음

Token, Embedding, Attention context loss/restoration을 root와 subpath에서
각각 검증했다. R3F asynchronous setup의 null event target은
`767e0ac` 별도 lifecycle bug-fix commit으로 해결했다.

## 16. Test race resolution

SceneFigure metrics store는 production semantics가 아닌 test
instrumentation이다. production code를 변경하지 않고 다음으로 해결했다.

- 일반 lane: 82 files / 587 tests, `maxWorkers=2`, parallel 유지
- lifecycle lane: 1 file / 7 tests
- `fileParallelism: false`
- `maxWorkers: 1`
- load promise와 exact created/disposed signal 사용
- timeout/retry/lock/sleep: 없음
- ordering dependency: 없음

최종 heading test 포함 total은 83 files / 594 tests다. Heading fix 전
최종 deterministic sequence는 5/5, 매 run 83 files / 593 tests였다.
Test-race resolution 자체의 production diff는 0이다.

## 17. Bundle와 performance

대표 production asset:

- app JS: 354,860 bytes
- R3F vendor: 877,498 bytes, one lazy deduplicated chunk
- scene chunks: 823–4,100 bytes
- Score Matrix scene: 24,941 bytes
- Home eager Learn/R3F scene requests: 0
- settled/offscreen RAF: 0
- concurrent Learn Canvas peak: 1

신규 model/texture/HDR/postprocessing asset는 없다.

## 18. Lighthouse와 security

7개 representative route:

| Route | Performance | Accessibility | Best Practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| Home | 97 | 100 | 100 | 100 |
| Part 0 | 97 | 100 | 100 | 100 |
| Part 1 | 84 | 100 | 100 | 100 |
| Part 2 | 84 | 100 | 100 | 100 |
| GPT | 84 | 100 | 100 | 100 |
| Block | 84 | 100 | 100 | 100 |
| Attention | 84 | 100 | 100 | 100 |

TBT는 전 route 0ms다. CLS는 0–0.1548 범위로 기록했다. CSP,
same-origin static assets, executable policy, Worker trust anchor,
canonical asset hash 검증이 PASS했다.

## 19. Root와 subpath production browser

- `/`: PASS
- `/transformer_viz/`: PASS
- Learning Workspace: 각 41 screenshots PASS
- Visual Reboot harness: 각 49 screenshots PASS
- 72 Figure/viewport geometry cases PASS
- root/subpath lazy chunk와 context recovery PASS
- runtime/network errors: 0

## 20. Worker, Lab, Score Matrix, Rust

- Worker request/response correlation: PASS
- generation, Stop, replay: PASS
- Worker WASM provenance/trust anchor: PASS
- Lab architecture/inspection workflows: PASS
- Score Matrix actual correlated trace: PASS
- Score Matrix numeric semantics change: 없음
- Rust fmt/clippy/tests/release/WASM check: PASS

## 21. Documentation과 evidence

문서:

- ADR 0016
- `docs/LEARN_VISUAL_STORYBOARD.md`
- `docs/LEARNING_VISUALIZATION_STRATEGY.md`
- `docs/VISUALIZATION_ARCHITECTURE.md`

핵심 evidence:

- `.omo/evidence/learn-visual-reboot/contact-sheet/`
- `.omo/evidence/learn-visual-reboot/final-browser/`
- `.omo/evidence/learn-visual-reboot/heading-a11y/`
- `.omo/evidence/learn-visual-reboot/lighthouse/`
- `.omo/evidence/learn-visual-reboot/vitest-determinism/`

## 22. Atomic commits와 delivery

주요 visual phase commit:

- `2dc9434` storyboard
- `ce966d2` shared scene language
- `935eae6` Part 0
- `01c74f0` Part 1
- `9740c15` Part 2
- `590ffc0` GPT
- `1047bf4` Transformer Block
- `1dbda57` Self-Attention
- `1932a35` mobile wrap bug fix
- `767e0ac` R3F lifecycle fix
- `225d6ac` deterministic lifecycle tests
- `16f8b12` final browser contracts
- `ea6dbe1` heading accessibility

모든 commit은 omo attribution을 포함한다. 최종 remote SHA parity는
delivery 단계에서 별도로 확인한다.

## 23. 승인 32/32와 deferred scope

1. Part 0 identity starts immediately — **YES**
2. Part 1 shares product language — **YES**
3. Part 2 remains same product — **YES**
4. GPT/Block/Attention system cohesion — **YES**
5. giant empty canvases removed — **YES**
6. primitive cube demo removed — **YES**
7. geometry fills stage meaningfully — **YES**
8. labels integrate with geometry — **YES**
9. scenes dominate controls visually — **YES**
10. Chapter spatial grammars differ — **YES**
11. token segmentation visually clear — **YES**
12. vocabulary ID lookup clear — **YES**
13. logit/probability correspondence visible — **YES**
14. autoregressive context growth visible — **YES**
15. embedding row extraction visible — **YES**
16. position addition avoids concatenation — **YES**
17. hidden shape invariant unmistakable — **YES**
18. GPT overall flow readable — **YES**
19. residual bypass immediately clear — **YES**
20. attention computation flow readable — **YES**
21. ThreeUI product language evident — **YES**
22. rim/depth/motion meaningful — **YES**
23. scene chrome restrained — **YES**
24. idle RAF controlled — **YES**
25. offscreen rendering controlled — **YES**
26. Home bundle protected — **YES**
27. WebGL contexts cleaned — **YES**
28. semantic fallbacks present — **YES**
29. reduced motion works — **YES**
30. keyboard/touch works — **YES**
31. root/subpath work — **YES**
32. Score Matrix unchanged — **YES**

Deferred scope는 actual Learn tensor mode, encoder-decoder,
cross-attention, training, KV cache, shared Canvas, shader-heavy
postprocessing, production Tensor Inspector다. 이번 작업에서 구현하지
않았다.
