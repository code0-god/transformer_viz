# Final verification: 21-step Guided + Explore Explorer

Run this acceptance from the repository root on the pinned toolchain. A release is accepted only
when every automated command and every real-browser item below passes against the same tree.

| Contract | Acceptance scope | Status before frozen-tree evidence |
|---|---|---|
| C001 | Happy generation path: ready Worker, `the cat sat on the`, exact generated-token stream and replay, 21-step Guided/Explore path, real tensor/source evidence, and no main-thread freeze or console panic | **PENDING** |
| C002 | Sampling/seed/stop edge contracts: deterministic modes, context limits, replacement and cancellation, stale-credit rejection, exact replay without resampling, finite/masked evidence, and recoverable Korean errors | **PENDING** |
| C003 | Full regression: numerical parity, schema/runtime tests, responsive/reflow/a11y/static root+subpath browser checks, Lighthouse and independent reviews, asset integrity, release gates, exact-tree receipts, and cleanup | **PENDING** |

No row may be changed to PASS until its receipts are captured from the final committed tree.

## Release and source binding

- nanoGPT upstream: `karpathy/nanoGPT` (MIT).
- Pinned full commit from `reference/NANOGPT_COMMIT`:
  `3adf61e154c3fe3fca428ad6bc3818b27a3b8291`.
- Repository-pinned canonical source: `reference/nanoGPT/model.py`.
- Public byte-identical source copy: `apps/web/public/reference/model.py`.
- Serialized deployed source-map path (unchanged): `reference/model.py`.
- Runtime source authority: `apps/web/public/models/edu/source_map.json`.
- The source map contains exactly the ten `OperationId` entries documented in
  `docs/ARCHITECTURE.md`; the 18 retained operation-detail boundaries resolve through those ten
  ranges. Generation sampling concepts must not manufacture source IDs.

## Executable automated gate

Run each command from the repository root and preserve its output in the release evidence:

```sh
cargo fmt --all -- --check
cargo test --workspace
cargo test -p nanogpt-model --test golden_parity
uv run --python 3.12 tools/reference/test_assets.py
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo clippy --target wasm32-unknown-unknown -p transformer-viz-web --all-features -- -D warnings
cargo build --workspace --release
cargo check --target wasm32-unknown-unknown -p transformer-viz-web
for asset in config.json manifest.json model.safetensors SHA256SUMS source_map.json tokenizer.json; do cmp "assets/models/edu/$asset" "apps/web/public/models/edu/$asset"; done
(cd assets/models/edu && shasum -a 256 -c SHA256SUMS)
./scripts/build-web.sh / /tmp/transformer-viz-final-dist
./scripts/check.sh
```

`scripts/check.sh` is the canonical one-command gate. It runs formatting, native workspace strict
Clippy, WASM-target strict Clippy, workspace tests, native release, WASM check, canonical asset
comparison/checksums, dependency policy, and an isolated Trunk release. Its temporary dist directory
is removed by its EXIT trap. Remove `/tmp/transformer-viz-final-dist` after browser acceptance.

## Isolated static and browser gates

Build root and project-subpath bundles into separate hosts:

```sh
rm -rf /tmp/transformer-viz-root /tmp/transformer-viz-subpath
./scripts/build-web.sh / /tmp/transformer-viz-root
./scripts/build-web.sh /transformer_viz/ /tmp/transformer-viz-subpath/transformer_viz
```

Serve each host in turn (server command in one terminal, verifier in a second), then stop it. The
verifier requires same-origin/base-prefix requests, zero failed requests/console/page errors, exact
breakpoints, keyboard behavior, reduced motion, Chrome AX landmarks, sticky geometry, and captures.

```sh
python3 -m http.server 8097 --bind 127.0.0.1 --directory /tmp/transformer-viz-root
./scripts/browser_responsive.py --url http://127.0.0.1:8097/ --evidence .omo/evidence/phase9/root
python3 -m http.server 8098 --bind 127.0.0.1 --directory /tmp/transformer-viz-subpath
./scripts/browser_responsive.py --url http://127.0.0.1:8098/transformer_viz/ --evidence .omo/evidence/phase9/subpath
```

With the corresponding server running, capture both Lighthouse profiles:

```sh
lighthouse http://127.0.0.1:8097/ --quiet --chrome-flags='--headless=new' --output=json --output-path=.omo/evidence/phase9/lighthouse-mobile.json
lighthouse http://127.0.0.1:8097/ --quiet --preset=desktop --chrome-flags='--headless=new' --output=json --output-path=.omo/evidence/phase9/lighthouse-desktop.json
```

## Guided + Explore acceptance

- Guided exposes exactly 21 ordered concepts in exactly four groups: Input representation (3),
  Transformer Block (9), Prediction (3), and Generation (6). Exactly one group reel is visible.
- Previous, Next, autoplay, speed, group selection, direct step selection, and mode switching share
  one curriculum cursor. The current step has text/shape treatment in addition to color and remains
  visible in its local reel.
- Guided and Explore are tabs for the same labeled tabpanel. Explore selects the shared architecture,
  evidence, Inspector, and source focus; switching modes does not fork trace state.
- Inspector exposes keyboard-operable Explanation, Tensor, and Source tabpanels. Architecture Map
  and Inspector source correspondence agree with the canonical ten-entry map.
- Starting generation grants exactly one initial forward credit. Each accepted step grants one exact
  continuation credit. Stop, replacement, stale callbacks, replay, and replay errors cannot spend or
  mint credit; replay shows retained evidence without resampling.

## Responsive browser acceptance

Test the exact breakpoint boundaries 1280/1279 and 768/767, plus 1440x900, 1024x768,
720x450 (the 200%-zoom layout equivalent), 390x844, and 320px wide (the WCAG 400%-reflow
equivalent).

- **Desktop, >=1280:** the shell is exactly one `100dvb` viewport and never `100vh`; the document has
  no horizontal or vertical scrollbar. Header, generation setup/timeline, context, Architecture Map,
  Main Canvas, Inspector, and Stage Rail fit. Architecture Map/Main Canvas/Inspector remain three
  columns. Only intended local regions scroll and the active curriculum step stays visible.
- **Tablet, 768-1279:** Architecture Map is a keyboard-accessible drawer, closed by default, whose
  open/close causes no Worker request or focus theft. Main Canvas and Inspector remain two columns;
  Stage Rail is below them. Generation controls reflow without clipping or page-width overflow.
- **Mobile, <768:** document vertical scrolling is enabled; all major regions are one column;
  Architecture Map remains a drawer. DOM, focus, AX, and visual order is Main Canvas, compact
  transport, Architecture Map, Inspector, then curriculum. The transport starts outside the initial
  viewport and remains bottom-pinned through Architecture Map and Inspector scrolling; curriculum
  alone owns the named navigation landmark. Step/token reels scroll locally on the inline axis. At
  390x844 there is no horizontal document
  overflow, clipped control, or clipped Korean/CJK copy.
- Capture `desktop-1440x900.png`, `tablet-1024x768.png`, and `mobile-390x844.png`, plus waiting and
  dense replay-backed Main Canvas captures at 1280x800 and 1440x900. Dense evidence must contribute
  to the outer canvas scroll range without hidden `.stage-visual` clipping. Record zero page/Worker
  console, exception, HTTP, and loading errors under `.omo/evidence/phase9/`.

## Accessibility and visual acceptance

- All visible interactive targets are at least 44px in both axes and have visible keyboard focus.
- Mode and Inspector tabs retain tablist/tab/tabpanel semantics and roving keyboard behavior.
- Current step and selected speed have non-color cues. Q/K/V and mask/sampling meanings retain
  shape, label, pattern, or text cues in addition to color.
- `prefers-reduced-motion: reduce` removes meaningful transitions/animations.
- Revealing the active rail item scrolls its local reel without moving focus.
- Korean/CJK uses wrapping that does not split or clip readable copy at 390px.

## Manual, independent, and frozen-tree gates

- In Chrome at 390x844 and 1440x900, set page zoom to 200%; complete Generate/Stop, generated-token
  replay, mode/Inspector tabs, Architecture drawer, and rail transport with no clipped content or
  horizontal document overflow. Repeat with OS/browser reduced motion and record the computed
  reduction plus usable state changes.
- Two independent review lanes inspect the frozen tree and fresh screenshots: one functional/
  accessibility/source-correspondence review and one visual/CJK/responsive review. Record reviewer
  IDs, findings, disposition, and confidence; the implementation author is not either lane.
- Commit only tracked Phase 9 source/docs/verifier as the ninth logical phase commit. Never commit
  `.omo` evidence or dist. From the frozen commit, run:

```sh
test "$(git rev-list --count 49e72ae..HEAD)" -eq 9
git log --reverse --format='%H %s' 49e72ae..HEAD | tee .omo/evidence/phase9/nine-phase-commits.txt
git rev-parse HEAD HEAD^{tree} | tee .omo/evidence/phase9/exact-tree.txt
git status --short | tee .omo/evidence/phase9/final-status.txt
test ! -s .omo/evidence/phase9/final-status.txt
git remote -v | tee .omo/evidence/phase9/remotes-no-push.txt
```

The release record must state that no push was performed.

## Cleanup receipt

The acceptance evidence must record that browser contexts and temporary profiles closed, the local
server stopped, port 8097 has no listener, `apps/web/dist`, `/tmp/transformer-viz-final-dist`, browser
test-result directories, and temporary profiles are absent, and no generated server process leaked.
Include changed-file scope, Rust pure-LOC counts (all changed production/test modules <=250),
screenshot hashes, Lighthouse summaries, independent verdicts, exact-tree/nine-commit stamps, and
cleanup checks in `.omo/evidence/phase9/cleanup.txt`. The final tracked worktree must be clean; do
not push. Commit only tracked Phase 9 source, documentation, and verifier script, never generated
evidence or dist output.
