# ThreeUI visual integration performance report

Date: 2026-08-29
Lighthouse: 13.4.1

## Baseline

Baseline is verified Phase 1 HEAD `f495973`.

| Surface | Performance | Accessibility | Best Practices | SEO | TBT | Requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | 66 | 100 | 100 | 100 | 0ms | 13 |
| Learn | 66 | 100 | 100 | 100 | 0ms | 13 |
| Lab | 66 | 100 | 100 | 100 | 0ms | 13 |

## Final Lighthouse

| Surface | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | Transfer | Requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | 65 | 100 | 100 | 100 | 5.703s | 5.703s | 0ms | 0.000208 | 3,310,516 B | 13 |
| Learn | 65 | 100 | 100 | 100 | 5.705s | 5.716s | 0ms | 0.000208 | 3,310,516 B | 13 |
| Lab | 65 | 100 | 100 | 100 | 5.704s | 5.704s | 0ms | 0.000254 | 3,310,516 B | 13 |

Performance changes by -1 point. TBT stays 0ms, requests stay 13, and
CLS remains effectively zero. Transfer increases 21,807 B because the local
static server returns uncompressed production artifacts.

## Deterministic bundle

| Artifact | Baseline raw | Final raw | Raw delta | Baseline gzip | Final gzip | Gzip delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Product CSS | 94,243 B | 108,687 B | +14,444 B | 14,712 B | 17,628 B | +2,916 B |
| Eager app JS | 290,650 B | 298,012 B | +7,362 B | 75,980 B | 77,494 B | +1,514 B |
| Eager total | 384,893 B | 406,699 B | +21,806 B | 90,692 B | 95,122 B | +4,430 B |
| Lazy Score Matrix | 901,491 B | 902,821 B | +1,330 B | 234,815 B | 235,156 B | +341 B |

Eager deterministic gzip changes by +4.88%. Cost comes from scoped ThreeUI
depth layers, responsive instrument layout, viewer controls, axis labels, and
accessible 3D/2D mode UI. No package-global stylesheet or legacy Three runtime
enters eager JavaScript.

## Runtime

- Worker starts: 1 before / 1 final.
- Worker posts: 4 before / 4 final.
- Score inspection requests: 1 before / 1 final.
- Twenty reopen cycles: no extra request, Canvas, or dialog.
- Idle renderer frames: 0.
- Home and Learn do not request the lazy Score Matrix chunk.
- Reduced motion does not mount the R3F renderer.

## Verdict

Accepted. Visible product value is substantial while main-thread blocking,
request count, Worker payload, numerical work, and idle rendering remain
unchanged.

## Evidence

```text
.omo/evidence/threeui-visual-pass/lighthouse/home.json
.omo/evidence/threeui-visual-pass/lighthouse/learn.json
.omo/evidence/threeui-visual-pass/lighthouse/lab.json
.omo/evidence/threeui-visual-pass/final-browser.json
```
