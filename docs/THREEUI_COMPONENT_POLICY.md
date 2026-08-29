# ThreeUI production component policy

Source: `@designcodeio/threeui@1.1.0`, upstream commit
`326580429881c2abe7893bee53c62cbb31b6ee49`.

## Allowlist

| Component | Class | Phase 1 usage | WebGL / RAF | Wrapper obligations |
| --- | --- | --- | --- | --- |
| `LumenCta` | WRAP | Lab Stop action | No WebGL; CSS transition only | Product label, compact dimensions, Korean font, reduced motion |

Import only through:

```ts
import { LumenCta } from
  "@designcodeio/threeui/components/LumenCta";
```

The subpath imports the component's scoped `lumen-cta.css`. It must not pull
the package-global reset.

Course Home route actions remain semantic anchors and its table-of-contents
button retains `aria-controls`; `LumenCta` cannot express either contract.
Generate remains native because the package component does not forward
`aria-busy`. These are deliberate semantic boundaries, not migration gaps.

## Denylist

| Component group | Phase 1 decision | Reason |
| --- | --- | --- |
| `AnimatedTopDock` | REJECT | Hard-coded English labels and internal-only route state |
| `DiagnosticsPanel` | REJECT | Hard-coded demo canvas; no product trace/data API |
| `UplinkLoader` | REJECT | Iframe with authored progress; no real model-status API |
| `SkeuomorphicToggle` | REJECT | No checked/onChange contract |
| `PredictiveArcCanvas` | REJECT | Continuous decorative RAF and no semantic data binding |
| Neuform button aliases | REJECT | Generic or iframe effects without complete product-state contracts |
| Full scenes and landing pages | REJECT | Hard-coded content/assets and legacy runtime coupling |
| Particle/field/background exports | VISUAL REFERENCE ONLY | Decorative Canvas/WebGL, often continuous and data-agnostic |

## CSS policy

- Never import `@designcodeio/threeui/style.css` globally.
- Permit component-local CSS emitted by allowlisted subpath imports.
- Keep adapter overrides small and scoped under `.threeui-action`.
- Reject a component if integration requires hundreds of override lines.

## Runtime policy

- Lightweight allowlisted controls may load eagerly.
- Canvas, WebGL, iframe, and legacy-Three exports require a new allowlist
  review and lazy loading.
- Reduced motion must prevent animated renderer mounting.
- Product state, Worker requests, Korean copy, and accessibility remain
  application-owned.
