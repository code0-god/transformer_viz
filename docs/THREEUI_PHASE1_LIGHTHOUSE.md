# ThreeUI Phase 1 Lighthouse report

Date: 2026-08-29
Lighthouse: 13.4.1
Mode: default mobile throttling, local production static artifacts

## Category scores

| Surface | Build | Performance | Accessibility | Best Practices | SEO |
| --- | --- | ---: | ---: | ---: | ---: |
| Home | Baseline | 71 | 100 | 100 | 100 |
| Home | Final | 66 | 100 | 100 | 100 |
| Token Learn | Baseline | 71 | 100 | 100 | 100 |
| Token Learn | Final | 66 | 100 | 100 | 100 |
| Lab | Baseline | 71 | 100 | 100 | 100 |
| Lab | Final | 66 | 100 | 100 | 100 |

## Final metrics

| Surface | FCP | LCP | Speed Index | TBT | CLS | Transfer | Requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | 5.56s | 5.56s | 5.56s | 0ms | 0.000114 | 3,288,709 B | 13 |
| Token Learn | 5.55s | 5.57s | 5.55s | 0ms | 0.000114 | 3,288,709 B | 13 |
| Lab | 5.55s | 5.55s | 5.55s | 0ms | 0.000114 | 3,288,709 B | 13 |

The repeated final Home run reproduced performance 66, accessibility 100,
best practices 100, SEO 100, FCP/LCP 5.55s, TBT 0ms, and the same transfer
and request totals.

## Baseline deltas

| Surface | Performance | FCP | LCP | TBT | CLS | Transfer | Requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | -5 | +1.50s | +0.30s | 0ms | +0.000025 | +19,977 B | 0 |
| Token Learn | -5 | +1.50s | +0.31s | 0ms | +0.000025 | +19,977 B | 0 |
| Lab | -5 | +1.50s | +0.30s | 0ms | +0.000025 | +19,977 B | 0 |

## Accessibility remediation

The first final Home audit found `--ui-text-soft` at 4.14:1 on white for the
model label and seven course-step summaries. Phase 1 changed the token from
`#777d86` to `#6a7078`:

- 5.00:1 on white;
- 4.58:1 on the page surface.

Regression tests now cover both pairs. Final Home, Learn, and Lab
accessibility scores are 100.

## Performance verdict

No severe performance regression remains.

- Total Blocking Time stays at 0ms on all routes.
- Request count stays at 13.
- CLS remains effectively zero.
- LCP changes by 0.30–0.31s under simulated mobile throttling.
- Raw transfer increases 19,977 B because the local Python server does not
  compress responses.
- Deterministic production gzip increases only 2,903 B for eager CSS + app
  JavaScript.
- Worker WASM and model payloads are unchanged.
- Lazy Score Matrix payload is unchanged and is not requested on Home or
  Learn.
- Browser lifecycle evidence records zero idle renderer frames.

The five-point synthetic performance change is accepted against the visible
product-wide migration. Startup remains dominated by the unchanged same-origin
Worker/model load; Phase 1 adds no request, main-thread blocking, or eager
WebGL work.

## Evidence

```text
.omo/evidence/threeui-phase1/lighthouse/home.json
.omo/evidence/threeui-phase1/lighthouse/home-repeat.json
.omo/evidence/threeui-phase1/lighthouse/learn.json
.omo/evidence/threeui-phase1/lighthouse/lab.json
.omo/evidence/threeui-phase1/lighthouse/baseline-home.json
.omo/evidence/threeui-phase1/lighthouse/baseline-learn.json
.omo/evidence/threeui-phase1/lighthouse/baseline-lab.json
```
