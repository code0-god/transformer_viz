# ThreeUI Phase 1 browser benchmark

Date: 2026-08-29

## Scope

Production Chrome exercised the complete ThreeUI-first product through both
supported deployment bases:

- `/`
- `/transformer_viz/`

Each deployment produced 23 screenshots and completed Home, Learn, Lab,
focused architecture, actual-data Score Matrix, responsive, navigation,
failure-isolation, and teardown contracts with zero network or runtime errors.

## Home and Learn comparison

- Home passed at widths 320, 390, 768, 1024, and 1440.
- Desktop, mobile, and 320px Home captures are committed.
- Token Figure identity, `wide` size, 800px preferred width, caption, article
  ownership, and zero overlay triggers match baseline.
- GPT Figure identity, `full` size, 832px preferred width, caption, article
  ownership, zero overlay triggers, and keyboard Chapter link match baseline.
- Twelve preserved educational Figures passed six viewport widths: 72 browser
  probes total.
- Learn requested no Score Matrix chunk and mounted no Canvas.

## Hands-on Lab workflow

Chrome performed this user workflow:

1. entered Lab with the real Worker ready;
2. generated one token from `the cat`;
3. replayed generation step 0;
4. opened root architecture;
5. zoomed, refit, selected Attention Head 2, and closed the viewer;
6. opened actual Score Matrix inspection;
7. requested one correlated Attention Head trace;
8. hovered and selected a real matrix cell;
9. orbited, panned, zoomed, and reset the camera;
10. lost and restored WebGL context;
11. closed and reopened inspection twenty times.

The Lab base retained Prompt, Generate, continuation, and four inspection
launchers while keeping architecture, Canvas, and dialogs unmounted until
requested.

## Worker request parity

| Contract | Baseline | Final |
| --- | ---: | ---: |
| Worker starts | 1 | 1 |
| Worker posts in generation/replay workflow | 4 | 4 |
| Replay post delta | 1 | 1 |
| Score Matrix inspection requests | 1 | 1 |
| Inspection requests after 20 reopen cycles | 1 | 1 |

Request types remain:

```text
initialize
generate
continue_generation
inspect_generation_step
```

The replay response preserved request ID, generation run ID, and step index.
Reopening presentation surfaces caused no additional Worker request.

## Score Matrix contracts

- Renderer stayed in a lazy production chunk.
- Canvas count while open: 1.
- Inspection request/response IDs: `2` / `2`.
- Inspection run IDs: `2` / `2`.
- Exact first table value and renderer source value:
  `0.15698754787445068`.
- Cell hover changed the scene and selection persisted.
- Orbit, pan, zoom, and reset each changed camera state.
- Idle animation frames after settling: 0.
- After twenty reopen cycles: 0 Canvas, 0 dialog, 1 inspection request.

## Failure isolation

| Injected condition | Result |
| --- | --- |
| WebGL unavailable | Open exact-value table; no Canvas or renderer request |
| Reduced motion | Open static table; no Canvas or renderer request |
| Renderer chunk blocked | Local alert and open table; product viewer remains |
| WebGL context loss | Open table while preserving viewer recovery |
| All CSS requests blocked | Semantic Home, Learn Figure, and Lab controls remain |

The CSS-free probe blocks both production stylesheets. It still finds Home
heading/navigation/start link, Token Learn article/Figure/caption/graphic, and
Lab heading/Prompt/Generate/settings semantics.

## Navigation contracts

Next, Previous, ToC, Figure Chapter link, Back, Forward, and direct routes all
start the new Chapter at document top. H1 or named section focus is restored.
Same-Chapter ToC state keeps its non-zero scroll and makes no `scrollTo` call.

## Responsive and overlay contracts

- Product surfaces passed 320 through 1440 widths.
- Lab overlays passed 320, 390, 768, 1024, 1366, and 1440.
- Every overlay had one modal dialog, inert background, scroll lock, visible
  content, zero local/document overflow, and a focused 44x44px close control.
- Closing the 320px overlay restored exact scroll position.

## Static deployment safety

Pinned Docker builds ran Vite with both public bases. `static-web-policy.py`
reported:

```text
/ CSP and same-origin static assets: PASS
/transformer_viz/ CSP and same-origin static assets: PASS
```

The complete browser contract then passed once from each generated artifact:

```text
Hybrid browser foundation: PASS (23 screenshots)
Hybrid browser foundation: PASS (23 screenshots)
```

Evidence:

- `.omo/evidence/threeui-phase1/static-direct/root/browser-hybrid.json`
- `.omo/evidence/threeui-phase1/static-direct/subpath/browser-hybrid.json`
- `docs/screenshots/threeui-phase1/milestone-responsive/`

## Residual observation

Chrome records one non-fatal upstream `THREE.Clock` deprecation warning while
the lazy R3F chunk initializes. Network and runtime error lists remain empty;
the warning does not alter rendering, requests, teardown, or accessible data.
