# ThreeUI visual neutralization audit

Date: 2026-08-29

## Audited source

```text
@designcodeio/threeui@1.1.0
upstream HEAD 326580429881c2abe7893bee53c62cbb31b6ee49
```

Installed and upstream revisions match. Production dependency resolution:

```text
@designcodeio/threeui 1.1.0
├── three 0.128.0
└── three 0.165.0

@react-three/fiber 9.7.0
└── three 0.185.1
```

Legacy Three versions remain package dependencies but do not enter eager
product JavaScript.

## Before

`apps/web/src/threeui/threeUi.css` flattened Lumen into a native dark button:

```css
box-shadow: none;
filter: none;
backdrop-filter: none;
```

Circle package structure remained in the DOM while every characteristic layer
was removed:

```text
.circle-buttons__atmosphere
.circle-button__aura
.circle-button__rim
.circle-button__face
.circle-button__details

display: none
```

Generate stayed a custom native button while Stop alone used Lumen. Inspection
remained four plain rectangular buttons. Header navigation used one OS-style
segmented container.

## Removed overrides

- Lumen `box-shadow: none`.
- Lumen `filter: none`.
- Lumen ghost `backdrop-filter: none`.
- Circle layer group `display: none`.
- Flat transparent Circle face.
- Prompt-specific native primary button skin.
- Four-column inspection button-card grid.
- Flat viewer and camera button styling.
- Shared rounded white Figure card framing.

## Restored ThreeUI character

Lumen:

- filtered package gradient;
- face/rim highlight;
- bounded depth shadow;
- hover lift and pressed response;
- primary status ring;
- loading-only pulse;
- ghost face for secondary and tertiary tiers.

Circle:

- atmosphere;
- aura;
- rim;
- face;
- detail marks;
- hover and pressed depth.

No restored effect uses WebGL, continuous RAF, idle floating, or decorative
background animation.

## Retained application overrides

- Korean font stack.
- 44px minimum target.
- native button semantics.
- product labels and runtime state.
- focus-visible treatment.
- neutral hue, saturation, and brightness.
- compact geometry.
- `prefers-reduced-motion` transition and pulse removal.
- scoped CSS bridge; no package-global stylesheet.

## Component decision

| Component | Decision | Product use |
| --- | --- | --- |
| `LumenCta` | Allow | Generate and Stop action tiers |
| `CircleButtons` | Allow | Focused viewer close |
| `RectangleButtons` | Reject | Hard-coded English labels and incomplete click/disabled/rich-content APIs |

Rich inspection launchers remain native buttons with product-owned structured
content and ThreeUI interaction language.

## Verification

- Characteristic layer static contract: PASS.
- Native semantic button contract: PASS.
- Reduced-motion browser fallback: PASS.
- CSS unavailable semantic fallback: PASS.
- Production Chrome visual evidence: 39 screenshots.
- Accessibility: 100 on Home, Learn, and Lab.
