# ThreeUI Phase 1 independent review

Date: 2026-08-29
Decision: PASS

## Ten design review questions

1. **YES — Does the product visibly use one canonical ThreeUI-first system?**
   Shell, navigation, status, Home, Learn chrome, Lab, and overlays share the
   neutral token bridge, compact controls, borders, radii, and surface
   hierarchy. Final ten-image review found no legacy product seam.

2. **YES — Is the global shell compact and useful rather than decorative?**
   The 56px desktop shell and responsive two-row mobile shell contain only
   brand, Learn/Lab navigation, and Worker status. The oversized prior Header
   decoration is absent.

3. **YES — Does Course Home feel like a learning application?**
   It presents one primary starting action, Lab and ToC secondary actions, and
   the seven-stage curriculum sequence without marketing or decorative WebGL.

4. **YES — Is Korean reading typography preserved?**
   The application-owned Korean stack remains. Learn computes to 17px text and
   29.75px line-height from 320 through 1440 widths; headings wrap without
   clipping.

5. **YES — Does Learn preserve an article-first hierarchy?**
   Each Chapter keeps one H1, one article, prose measure, inline Figures,
   semantic captions, ToC, and Previous/Next controls. It adds no viewer
   trigger or permanent sidebar.

6. **YES — Are Figure surfaces integrated without changing their meaning?**
   Twelve Figures retain registry identity, preferred geometry, captions,
   SVG/DOM or mobile fallback behavior, and article position across 72 browser
   probes.

7. **YES — Is Lab organized around experimentation before inspection?**
   Prompt, Generate/Stop, settings, and continuation form the primary flow.
   Four inspection launchers appear after real evidence; architecture and R3F
   stay unmounted until requested.

8. **YES — Do focused viewers belong to the same product system?**
   Architecture and Score Matrix share one modal shell, header, native
   controls, focus behavior, inert backdrop, bounded body, and close action
   while preserving renderer-specific visuals.

9. **YES — Is the design responsive at the required extremes?**
   Home, Learn, Lab, and overlays pass 320, 390, 768, 1024, 1366, and 1440
   checks where applicable. Mobile actions are 44px, Lab stacks, and document
   overflow is zero.

10. **YES — Are error and reduced-motion states designed as first-class UI?**
    Worker failure detail is visible and unclipped. WebGL absence, reduced
    motion, renderer import failure, and context loss expose exact static data
    without collapsing the product shell.

## Nine technical review questions

1. **YES — Does ThreeUI ship as a real production dependency?**
   `@designcodeio/threeui@1.1.0` is under `dependencies`; final eager assets
   contain `lumen-cta__button` and `circle-button`.

2. **YES — Are package boundaries explicit and tested?**
   Only `LumenCta` and `CircleButtons` are allowlisted through component
   subpaths. Denied iframe, decorative RAF, and semantically incomplete
   components are documented.

3. **YES — Are Three and R3F versions isolated?**
   Product R3F resolves `three@0.185.1`; package aliases remain visible in the
   lock graph but absent from eager production JavaScript.

4. **YES — Is global package CSS prevented?**
   Source policy tests reject `@designcodeio/threeui/style.css`. Scoped
   subpath CSS and the application bridge ship instead.

5. **YES — Does actual-data Score Matrix remain lazy and exact?**
   Its renderer remains a separate chunk, mounts only after one correlated
   Worker request, uses demand rendering, and matches the exact accessible
   table value `0.15698754787445068`.

6. **YES — Are Worker, replay, and generation semantics unchanged?**
   Baseline and final each use one Worker start, four generation/replay posts,
   one replay request, and one Score Matrix request. Request/run/step
   correlations remain exact.

7. **YES — Are lifecycle and failure boundaries leak-free?**
   Twenty reopen cycles end with zero Canvas, zero dialog, one inspection
   request, and zero idle frames. Chrome process groups now close before
   verifier profile cleanup.

8. **YES — Are accessibility and deployment contracts retained?**
   Native semantics, focus restoration, inert modal background, named exact
   table, 44px targets, WCAG AA token contrast, CSP, same-origin assets, root,
   and `/transformer_viz/` all pass.

9. **YES — Do complete release gates pass without suppressed failures?**
   Canonical `scripts/check.sh` passes frozen dependencies, binding freshness,
   532 web tests, strict native/WASM Clippy, Rust tests/release builds,
   checksums, both static builds, security sentinels, and all real-browser
   contracts.

## Phase 1 completion criteria

- **YES** — ADR 0013 findings preserved and status superseded by ADR 0014.
- **YES** — ADR 0014 accepted as product direction.
- **YES** — Current package metadata/source and dependency identities audited.
- **YES** — ThreeUI production dependency and visible shipping components.
- **YES** — Shell, Home, Learn, Lab, and overlay migration complete.
- **YES** — Semantic Figures, article structure, DiagramViewport, and R3F
  Score Matrix boundaries preserved.
- **YES** — Worker generation, Stop, replay, request parity, and exact trace
  behavior preserved.
- **YES** — Theme bridge, CSS strategy, allowlist/denylist, and runtime policy
  tested.
- **YES** — Legacy product CSS retired with zero unreferenced global classes.
- **YES** — Responsive, accessibility, reduced-motion, and failure isolation
  pass real Chrome.
- **YES** — Root and `/transformer_viz/` production artifacts pass.
- **YES** — Bundle, visual, browser, security, and complete release reports
  exist.

## Out-of-scope audit

`git diff --name-only origin/main` contains 147 Phase 1 paths and no changes
under:

```text
assets/models/
apps/worker/
crates/
reference/nanoGPT/
apps/web/public/models/
apps/web/src/generated/
```

Application source contains no `VITE_THREEUI_SPIKE`, `threeui-spike`,
`PredictiveArcCanvas`, or `DiagnosticsPanel` runtime path.

Phase 1 did not add progress persistence, backend/API work, CDN assets, WebGPU,
threaded inference, model/tokenizer changes, new tensor scenes, mock traces, or
Phase 2 Figure implementation.

## Evidence index

- `docs/THREEUI_COMPONENT_POLICY.md`
- `docs/THREEUI_PHASE1_BUNDLE_REPORT.md`
- `docs/THREEUI_PHASE1_CSS_RETIREMENT.md`
- `docs/THREEUI_PHASE1_RESPONSIVE_REPORT.md`
- `docs/THREEUI_PHASE1_BROWSER_BENCHMARK.md`
- `docs/THREEUI_PHASE1_VISUAL_REGRESSION.md`
- `docs/THREEUI_PHASE2_PLAN.md`
- `.omo/evidence/threeui-phase1/`
