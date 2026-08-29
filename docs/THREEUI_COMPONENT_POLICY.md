# ThreeUI production component policy

Source: `@designcodeio/threeui@1.1.0`, upstream commit
`326580429881c2abe7893bee53c62cbb31b6ee49`.

## Allowlist

| Component | Class | Production usage | WebGL / RAF | Wrapper obligations |
| --- | --- | --- | --- | --- |
| `LumenCta` | WRAP | Primary Generate; secondary Stop; selected action states | No WebGL or RAF; CSS transitions and loading-only ring pulse | Product label/state, tier, compact dimensions, Korean font, native button semantics, reduced motion |
| `CircleButtons` | WRAP | Focused viewer close action | No WebGL or RAF; CSS transitions only | Product aria-label, 44px target, retained atmosphere/aura/rim/face/details, reduced motion |

Import only through:

```ts
import { LumenCta } from
  "@designcodeio/threeui/components/LumenCta";
import { CircleButtons } from
  "@designcodeio/threeui/components/CircleButtons";
```

The published 1.1.0 subpath JavaScript keeps component DOM and state behavior,
but its built CSS import is emitted as `/* empty css */`. The only published
runtime stylesheet is `lib-dist/style.css`, which combines the entire package.
Production therefore copies only the audited Lumen and Circle visual rules
into the scoped adapter layer. It does not import the package-global reset.

Control tiers:

- Primary: Lumen gradient, depth shadow, hover lift, and status ring.
- Secondary: Lumen ghost face, inset highlight, restrained depth, no ring.
- Tertiary: lower-shadow ghost treatment or a semantic project-owned control
  when `href`, `aria-controls`, or rich children are required.

Course Home actions remain semantic anchors and its table-of-contents button
retains `aria-controls`; `LumenCta` cannot express either contract. Structured
inspection launchers remain native buttons because package Rectangle variants
hard-code English labels and do not expose disabled, click, or rich-content
state contracts. These are deliberate semantic boundaries, not visual gaps.

## Denylist

| Component group | Phase 1 decision | Reason |
| --- | --- | --- |
| `AnimatedTopDock` | REJECT | Hard-coded English labels and internal-only route state |
| `DiagnosticsPanel` | REJECT | Hard-coded demo canvas; no product trace/data API |
| `UplinkLoader` | REJECT | Iframe with authored progress; no real model-status API |
| `SkeuomorphicToggle` | REJECT | No checked/onChange contract |
| `PredictiveArcCanvas` | REJECT | Continuous decorative RAF and no semantic data binding |
| `RectangleButtons` content variants | REJECT | Hard-coded English labels; most variants do not forward click, disabled, type, or accessible rich-content state |
| Neuform button aliases | REJECT | Generic or iframe effects without complete product-state contracts |
| Full scenes and landing pages | REJECT | Hard-coded content/assets and legacy runtime coupling |
| Particle/field/background exports | VISUAL REFERENCE ONLY | Decorative Canvas/WebGL, often continuous and data-agnostic |

## CSS policy

- Never import `@designcodeio/threeui/style.css` globally.
- Keep audited component rules scoped under `.threeui-action` or
  `.threeui-icon-action`.
- Preserve Lumen filter/gradient/shadow/ring and Circle
  atmosphere/aura/rim/face/details instead of flattening them.
- Product overrides may own Korean font, size, focus, hue, saturation,
  brightness, reduced motion, and neutral theme integration.
- Reject a component if integration requires hundreds of override lines.

## Runtime policy

- Lightweight allowlisted controls may load eagerly.
- Canvas, WebGL, iframe, and legacy-Three exports require a new allowlist
  review and lazy loading.
- Reduced motion prevents animated renderer requests and mounting; the exact
  HTML data surface opens instead.
- Product state, Worker requests, Korean copy, and accessibility remain
  application-owned.
