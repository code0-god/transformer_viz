# Third-party notices

## nanoGPT

nanoGPT is Copyright (c) 2022 Andrej Karpathy and distributed under the MIT License. The full,
unmodified license text is available at:

- `reference/nanoGPT/LICENSE`
- `assets/reference/nanoGPT-LICENSE.txt`
- `apps/web/public/reference/LICENSE`

Source provenance and the immutable upstream revision are documented in
`reference/NANOGPT_SOURCE.md`.

## Educational model and corpus

The bundled educational model assets and training corpus are dedicated under CC0 1.0:

| Material | License record |
|---|---|
| `nanogpt-edu` model assets | `assets/models/edu/manifest.json` (`license: CC0-1.0`) |
| Educational corpus | `assets/corpus/LICENSE.md` |

The release build verifies the canonical model assets byte-for-byte. CC0 terms are available at
<https://creativecommons.org/publicdomain/zero/1.0/>.

## Browser runtime

Versions and licenses are verified from the frozen pnpm installation:

| Package | Version | License | Project |
|---|---:|---|---|
| React | 19.2.8 | MIT | <https://react.dev/> |
| React DOM | 19.2.8 | MIT | <https://react.dev/> |
| Scheduler | 0.27.0 | MIT | <https://github.com/facebook/react> |
| KaTeX | 0.18.4 | MIT | <https://katex.org/> |
| `@designcodeio/threeui` | 1.1.0 | MIT | <https://threeui.com/> |
| `three128` (`three`) | 0.128.0 | MIT | <https://threejs.org/> |
| `three165` (`three`) | 0.165.0 | MIT | <https://threejs.org/> |

KaTeX's bundled font files are emitted as same-origin static assets and remain under the KaTeX
distribution terms.

ThreeUI is the canonical product UI dependency. Production imports are limited
to the component allowlist in `docs/THREEUI_COMPONENT_POLICY.md`; legacy Three
aliases remain visible in the dependency graph even when allowlisted
components do not bundle them.

## JavaScript build and verification tools

These packages build or verify the application and do not execute as external services:

| Package | Version | License |
|---|---:|---|
| Vite | 8.2.2 | MIT |
| `@vitejs/plugin-react` | 6.1.0 | MIT |
| TypeScript | 7.0.2 | Apache-2.0 |
| Vitest | 4.1.11 | MIT |
| Biome | 2.5.10 | MIT OR Apache-2.0 |
| Binaryen | 123.0.0 | Apache-2.0 |

Complete dependency versions and integrity hashes are recorded in `pnpm-lock.yaml`. Package license
texts remain available in the installed package distributions.
