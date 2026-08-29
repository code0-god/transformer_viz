# ADR 0014: ThreeUI-first product UI

- Status: Accepted
- Date: 2026-08-29
- Supersedes: ADR 0013 in product direction

## Context

ADR 0013 correctly found that ThreeUI did not economically replace
Transformer Viz's semantic SVG or trace-backed R3F renderers. Product priority
has since changed. The question is no longer whether ThreeUI is the cheapest
renderer replacement; the goal is one canonical visual and interaction system
across the product.

## Decision

Adopt `@designcodeio/threeui` as the production visual layer.

ThreeUI-first means preserving the library's visual and interaction character
rather than flattening it into legacy custom controls.

- ThreeUI owns shell, navigation language, controls, status, surfaces, Course
  Home, Learn chrome, and Lab UI.
- DOM, SVG, and KaTeX continue to own educational semantics.
- R3F continues to own actual trace-backed tensor and matrix visualization.
- Product state, Korean copy, accessibility, and Worker behavior remain
  transformer_viz responsibilities.

## Package boundary

Published package limitations are isolated through a small adapter layer:

- import allowlisted components through package subpaths;
- reject hard-coded iframe demos and data-agnostic renderers from semantic
  product roles;
- keep native DOM semantics when package APIs cannot express them;
- add surface-level error boundaries around package components;
- prevent animated components from mounting under reduced motion;
- lazy-load renderer-heavy exports.

ThreeUI's `three128` and `three165` aliases coexist with the product's
`three@0.185.1`, but Phase 1 shipping components must not load legacy Three
runtimes. Dependency and bundle reports must keep all identities visible.

## Bundle policy

ThreeUI bundle cost is intentionally accepted when it produces visible product
value. Lightweight controls may load eagerly. WebGL, Canvas, iframe, and large
authored scenes remain lazy or denied. Static routes should idle with no
unjustified animation frame.

## Global CSS strategy

Do not import `@designcodeio/threeui/style.css` globally. Its broad element,
body, typography, control, and overflow rules cannot be made safe merely by a
lower cascade layer.

The published 1.1.0 component subpaths preserve package DOM and behavior, but
their JavaScript contains `/* empty css */`; the only published runtime CSS is
the package-global stylesheet. The application therefore ports only audited
Lumen and Circle rules into the scoped adapter bridge. Korean fonts, focus,
size, theme tuning, reduced motion, and semantic Figure CSS remain
application-owned.

## Theme

The canonical product language follows ThreeUI's restrained neutral palette:
graphite text, quiet application planes, precise borders, low radii, compact
controls, visible but bounded face/rim depth, purposeful hover/pressed motion,
and renderer-first hierarchy. Learn keeps a bright reading plane with the
existing Korean font stack and readable body size.

Transformer-specific input, output, attention, mask, selection, and tensor
colors remain semantic tokens rather than product-shell colors.

## Migration phases

1. Phase 1: shell, navigation, status, Course Home, shared controls, Learn
   chrome, Lab base UI, inspection launchers, and overlay chrome.
2. Phase 2: classify selected learning Figures as keep-SVG, hybrid, or ThreeUI
   interactive. No implementation is authorized by this ADR.
3. Later phases may add progress persistence or new tensor scenes only through
   separate product decisions.

## Legacy CSS retirement

Phase 1 splits product tokens/shell styles from semantic renderer styles.
Global Header, Home, button, field, status, and Lab-card rules are retired once
their migrated components no longer reference them. Figure geometry,
architecture, DiagramViewport, and Score Matrix CSS are not legacy.

Compatibility aliases may remain only while consumers exist. A final
reference scan and browser comparison must show one UI system rather than
ThreeUI plus permanent bridge and patch layers.

## Consequences

Initial CSS and JavaScript may increase. The migration must measure that cost,
preserve root and GitHub Pages subpath builds, keep accessibility and Korean
typography intact, and pass real-browser Worker, scroll, overlay, Figure, and
R3F regression contracts.
