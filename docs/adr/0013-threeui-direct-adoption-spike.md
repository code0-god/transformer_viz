# ADR 0013: Reject ThreeUI package adoption

- Status: Superseded in product direction by ADR 0014
- Date: 2026-08-28

## Context

ADR 0010 selected semantic DOM/SVG for curriculum architecture and lazy,
demand-rendered R3F for numerical tensors. This spike tested whether direct use
of `@designcodeio/threeui@1.1.0` could make Course Home, the inline GPT Figure,
or Lab faster to author and better in production without replacing that
architecture.

The spike used published package components through thin adapters:

| Benchmark | Package component | Result |
| --- | --- | --- |
| Course Home | `PredictiveArcCanvas` | Polished 2D motion field, but continuous RAF and no semantic course API |
| GPT Figure | `PredictiveArcCanvas` | Decorative background only; project DOM still owns all nine stages, selection, labels, and fallback |
| Lab | `DiagnosticsPanel` | Hard-coded iframe demo content; existing controls and R3F Score Matrix still provide all product behavior |

Root and `/transformer_viz/` production builds passed paired browser contracts.
The host wrapper preserved Korean text, keyboard semantics, reduced motion,
WebGL-free core controls, Worker behavior, and Score Matrix lifecycle.

Those passes demonstrate wrapper containment, not package fit. The package:

- publishes a 54.5 MB unpacked catalog with hard-coded and iframe-backed
  components;
- declares `three128` (`three@0.128.0`) and `three165`
  (`three@0.165.0`) beside this app's `three@0.185.1`;
- ships a global stylesheet with element and body resets that cannot be safely
  imported;
- continuously schedules a frame for the selected 2D canvas while mounted;
- exposes no data-bound connector geometry or semantic Figure API;
- differs from audited source HEAD in the accepted predictive variant name.

The alternative screenshots looked more editorial because of project-owned DOM
and local CSS. That visual direction can be implemented without adopting the
package.

## Scorecard

Scores measure package value in this product, not quality of the isolated spike
wrapper.

| Criterion | Score / 5 |
| --- | ---: |
| Visual Quality | 4 |
| Development Speed | 2 |
| Maintainability | 2 |
| Accessibility | 3 |
| Performance | 2 |
| Bundle Cost | 2 |
| React Integration | 3 |
| Three/R3F Compatibility | 2 |
| Korean Typography | 3 |
| Responsive | 3 |
| Theme Fit | 2 |
| GitHub Pages Compatibility | 4 |

## Decision

Reject ThreeUI package adoption under the spike's cost-replacement question.

Keep ADR 0010 unchanged:

- semantic curriculum Figures remain DOM/SVG;
- Score Matrix remains lazy, demand-rendered R3F;
- no ThreeUI global CSS, package renderer, iframe catalog panel, or legacy
  Three runtime enters production;
- no Home, GPT, or Lab migration follows from this spike alone.

The spike branch kept the package as a development-only dependency and exposed
the benchmark only when built with `VITE_THREEUI_SPIKE=1`. Its default build
emitted no ThreeUI package payload.

## Consequences

The technical findings remain valid. ADR 0014 changes the product priority:
ThreeUI becomes the canonical product layer while semantic renderers remain
specialized and package limitations stay isolated behind adapters.
