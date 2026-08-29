# ThreeUI Phase 1 CSS retirement

Phase 1 retires product UI rules only after their migrated consumers and
browser evidence are green. Semantic renderer CSS remains.

## Ownership after migration

| Owner | Styles |
| --- | --- |
| `src/threeui/threeUi.css` | canonical tokens, package adapter overrides, shared product controls and surfaces |
| component-local CSS | Header, Course Home, Learn chrome, Lab panels, overlay chrome |
| semantic renderer CSS | educational SVG geometry, architecture diagrams, DiagramViewport transforms, Score Matrix, KaTeX |

## Retirement sequence

### Shell and Home milestone

Move then remove these global groups from `style.css`:

- `.architecture-app`, `.architecture-header`, `.brand-lockup`
- `.app-navigation`, `.lifecycle`, `.status-badge`
- `.course-home*`

Keep route layout aliases only until every Home/Learn/Lab screenshot uses the
new component-local classes.

### Learn milestone

Migrate product chrome in:

- `learningWorkspace.css`
- the non-diagram section of `curriculum.css`
- product surfaces in `learningGuide.css`

Retain article grid semantics, Figure size geometry, SVG diagram selectors,
KaTeX rules, and chapter focus/navigation behavior.

### Lab and overlay milestone

Move then remove these global groups from `style.css`:

- `.lab-introduction*`
- `.generation-*`, `.prompt-field`
- generic migrated button/field presentation
- migrated architecture-shell chrome

Restyle but retain behavior-owned rules in:

- `ContinuationPanel.css`
- `LabInspectionPanel.css`
- `focusedViewer.css`
- `diagramViewport.css`
- `scoreMatrix.css`

## Preserve list

Do not classify these as legacy UI:

- `architecture/architecture.css` and diagram-specific geometry CSS;
- `.part0-diagram*`, `.part1-diagram*`, `.part2-diagram*`;
- `.learning-figure__graphic` sizing and semantic fallback rules;
- DiagramViewport pan/zoom/resize rules;
- Score Matrix table, actual-data R3F scene, and lazy-loading boundary;
- reduced-motion, focus, visually-hidden, skip-link, and error-state rules.

## Removal gates

A selector group is removable only when:

1. source reference search finds no consumer;
2. focused tests pass;
3. production build passes;
4. matching desktop and 390px screenshots are fresh;
5. visual QA finds no dual-system seam;
6. semantic Figure and Worker contracts remain unchanged.

No compatibility alias survives final Phase 1 unless a live consumer and
removal owner are recorded.
