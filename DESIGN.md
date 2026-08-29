# Transformer Viz Design

<!-- impeccable:design-schema 1 -->

## Direction

**ThreeUI Instrument** is the canonical visual world: a neutral learning
instrument with graphite controls, precise borders, quiet layered surfaces,
and trace-backed visualizations as the strongest visual moments.

The result should feel like Transformer curriculum inside ThreeUI, not the old
parchment interface recolored with gray.

## Product roles

- ThreeUI: shell, navigation language, status, controls, surfaces, and Lab UI.
- DOM/SVG/KaTeX: article semantics, educational Figures, architecture
  relationships, formulas, and exact labels.
- R3F: actual trace-backed numeric visualization.

## Grounding

Visual tokens derive from ThreeUI 1.1's light monotone system:

- page `#ececeb`
- wall `#f3f3f2`
- surface `#f7f7f6`
- content `#fbfbfa`
- foreground `#121211`
- muted foreground `#5c5c5a`
- filled control `#0c0c0b`

The package source at commit
`326580429881c2abe7893bee53c62cbb31b6ee49` is the reference. Product wrappers
may tune tokens but must not recreate the old warm theme.

## Typography

- UI and Korean prose keep `"Avenir Next", "Noto Sans KR",
  "Apple SD Gothic Neo", sans-serif`.
- Technical labels may use `ui-monospace`, `SFMono-Regular`, Menlo, monospace.
- Learn body remains at least 17px with relaxed line-height.
- Korean headings and controls use `word-break: keep-all` plus emergency
  `overflow-wrap: anywhere`.
- ThreeUI font assets are not imported.

## Surface hierarchy

1. Page: quiet neutral background.
2. Shell: compact wall surface with a precise lower border.
3. Product surface: low-radius panel for Home and Lab.
4. Reading plane: one stable light content surface, never paragraph cards.
5. Renderer surface: bounded Figure, SVG viewport, or R3F canvas.
6. Overlay: focused work surface with stronger edge and restrained shadow.

## Layout recipes

- Shell and Lab follow StyleGallery `command-surface`: stable command regions,
  wrapping control rows, and body-owned content scrolling.
- Learn follows `article-page`: explicit reading measure, document scrolling,
  and supplemental content in normal flow on mobile.
- Home uses a constrained app-entry composition, not a marketing landing page.

## Spacing and shape

- Base spacing: 4px.
- Common gaps: 8, 12, 16, 24, 32px.
- Control height: 40–44px.
- Control radius: 5–7px.
- Surface radius: 7–10px.
- Shadows are reserved for overlays and the package-authored primary action.
- Borders carry most containment.

## Color

Product-shell color is neutral. Readiness may use green, warning amber, and
error red, always paired with text or an icon. Transformer input/output,
attention, mask, and tensor colors remain semantic and do not recolor global
controls.

## Controls

Primary actions use the allowlisted ThreeUI `LumenCta` through a typed adapter.
The adapter preserves package rendering while enforcing product labels,
disabled state, Korean typography, compact dimensions, and reduced motion.

Navigation remains semantic links. Native fields, range inputs, buttons, and
dialogs keep their semantics and adopt the same tokens. No package component is
forced into a role its public API cannot represent.

## Motion

- No permanent decorative RAF on static routes.
- Hover and press feedback stays under 180ms.
- Reduced motion removes transitions and blocks animated renderer mounting.
- Motion never carries exclusive meaning.

## Responsive behavior

- Desktop shell is one compact row.
- At 390px, brand, Learn/Lab navigation, and status do not overlap.
- Home course sequence remains readable before decorative content.
- Learn remains a 17px single reading column.
- Lab becomes a single-column instrument with 44px targets.
- No permanent sidebar.

## CSS architecture

Order:

1. product tokens and reset;
2. component-scoped ThreeUI package CSS from subpath imports;
3. `threeUiBridge.css` adapter layer;
4. application shell and route styles;
5. component-local Learn, Figure, overlay, architecture, and R3F styles.

Global `@designcodeio/threeui/style.css` is denied. Component-local package CSS
is allowed only when selectors stay scoped and production bundle inspection
confirms no global reset.

## Accessibility

WCAG 2.2 AA remains the floor. Preserve headings, links, buttons, inputs,
figures, dialogs, focus restoration, inert backgrounds, exact table fallbacks,
and non-color state cues. Canvas is supplementary.

## Preservation boundary

Phase 1 does not rewrite NLP, Token, Vocabulary, tokenization, Language Model,
Embedding, GPT, Transformer Block, or Self-Attention Figure geometry. It does
not replace the R3F Score Matrix scene. Surrounding product surfaces may
change.

## Review standard

Phase 1 passes only when Home, Learn, and Lab visibly belong to one ThreeUI
product system, Korean reading remains comfortable, real controls still drive
the Worker, renderer boundaries remain intact, and no old global button/panel
language remains visible.
