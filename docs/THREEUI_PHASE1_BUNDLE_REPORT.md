# ThreeUI Phase 1 bundle comparison

Date: 2026-08-29

## Measurement boundary

Baseline artifacts come from the clean `origin/main` production build captured
under `.omo/evidence/threeui-first-phase1/baseline/dist-root`. Final artifacts
come from the verified `feat/threeui-first-ui` production build after the
Shell, Home, Learn, Lab, focused-viewer, DiagramViewport, and Score Matrix
chrome migrations.

Both builds use the same production Worker snapshot and Vite build path.
Numbers below are exact file sizes; gzip uses level 9 for both sides.

## Dependency identities

```text
@designcodeio/threeui@1.1.0
├── three128@npm:three@0.128.0
├── three165@npm:three@0.165.0
└── three@0.165.0 peer

@react-three/fiber@9.7.0
└── three@0.185.1 peer

transformer_viz
└── three@0.185.1
```

The package aliases remain installed but do not occur in the eager production
JavaScript. Product R3F continues to resolve `three@0.185.1`.

## Artifact comparison

| Artifact | Baseline raw | Final raw | Raw delta | Baseline gzip | Final gzip | Gzip delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Product CSS | 78,696 B | 101,174 B | +22,478 B | 13,114 B | 15,866 B | +2,752 B |
| Eager app JS | 285,938 B | 290,650 B | +4,712 B | 74,675 B | 75,979 B | +1,304 B |
| Eager CSS + app JS | 364,634 B | 391,824 B | +27,190 B (+7.46%) | 87,789 B | 91,845 B | +4,056 B (+4.62%) |
| Lazy Score Matrix | 901,491 B | 901,491 B | 0 B | 234,815 B | 234,817 B | +2 B |
| Worker WASM | 1,945,143 B | 1,945,143 B | 0 B | 476,405 B | 476,405 B | 0 B |

## Shipping and exclusion proof

Final eager artifacts contain both allowlisted package boundaries:

- `lumen-cta__button`
- `circle-button`

Final eager artifacts exclude:

- `three128`
- `three165`
- `.threeui-mount`
- `.animated-top-dock-component`
- `ThreeUI Fragment Mono`

`ScoreMatrixScene` remains a separate dynamic-import chunk and is requested
only after actual replay-backed inspection. Browser evidence records
`lazyChunkRequested: true`, one correlated inspection request, zero idle
animation frames, and teardown after twenty reopen cycles.

Reduced-motion users do not request or mount the R3F renderer. The accessible
exact-value table opens as the static product surface instead.

## Evaluation

Phase 1 adds 4,056 gzip bytes to the eager CSS + application JavaScript
boundary while migrating every visible product surface. Lazy renderer and
Worker payloads remain unchanged. This is accepted:

- package components ship visibly rather than existing as an unused
  dependency;
- legacy Three runtimes stay outside the eager bundle;
- no package-global stylesheet ships;
- semantic DOM/SVG Figures and Worker assets add no bundle cost;
- actual-data R3F remains lazy, demand-rendered, and error-isolated.

The raw CSS increase is intentionally larger than the JavaScript increase
because Phase 1 replaces the complete product chrome while retaining semantic
Figure geometry. Legacy selector retirement is tracked separately and must
not delete renderer CSS to improve this number artificially.

## Commands

```text
docker compose run --rm web pnpm --dir apps/web test \
  src/threeui/ThreeUi.test.tsx \
  src/tracks/visualization/ThreeVisualizationSurface.test.tsx
docker compose run --rm web pnpm --dir apps/web lint
docker compose run --rm web pnpm --dir apps/web typecheck
docker compose run --rm web pnpm build
docker compose run --rm web pnpm --dir apps/web list \
  @designcodeio/threeui three @react-three/fiber --depth 5
```

All commands passed.
