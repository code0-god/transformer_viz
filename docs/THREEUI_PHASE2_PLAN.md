# ThreeUI-first Product Migration — Phase 2 plan

Status: Planning only
Date: 2026-08-29

Phase 2 has no implementation authorization in this change set. ADR 0014
continues to define ThreeUI as product chrome while semantic renderers retain
their current owners.

## Goal

Classify each educational Figure using evidence, then propose only the
interactions that improve comprehension without replacing exact semantics,
accessible fallbacks, or real trace values.

## Classification outcomes

Every Figure receives exactly one outcome:

1. **KEEP SVG/DOM** — existing geometry and semantic fallback already explain
   the concept best.
2. **HYBRID** — preserve the semantic Figure and add one optional, bounded
   ThreeUI interaction around real content or state.
3. **THREEUI INTERACTIVE CANDIDATE** — a package primitive has a complete data,
   keyboard, Korean-copy, reduced-motion, and teardown contract for the
   teaching goal.

No classification alone authorizes code.

## Candidate inventory

| Figure family | Initial hypothesis | Required evidence |
| --- | --- | --- |
| NLP pipeline | KEEP SVG/DOM | Beginner comprehension review |
| Token boundary | KEEP SVG/DOM | Verify no interaction clarifies boundaries better |
| Vocabulary and Token ID | HYBRID candidate | Test a semantic lookup interaction without hiding table fallback |
| Tokenization methods | HYBRID candidate | Compare static reading against one controlled method switch |
| Language-model sequence Figures | KEEP SVG/DOM | Confirm sequence remains clearest in linear diagrams |
| Embedding and hidden-state Figures | HYBRID candidate | Require real model values and exact text alternative |
| GPT root architecture | KEEP SVG/DOM | Preserve complete forward order and Chapter link |
| Transformer Block | KEEP SVG/DOM | Preserve residual and connector geometry |
| Self-Attention | KEEP SVG/DOM | Preserve operation selection and exact math |
| Attention Score Matrix | KEEP current R3F hybrid | Already actual-data, lazy, demand-rendered, and table-backed |

## Research gates

For each HYBRID or THREEUI candidate:

1. identify one learner question the interaction answers;
2. map package API to real curriculum or Worker data;
3. prove keyboard, screen-reader, Korean-copy, and 44px target behavior;
4. provide a static reduced-motion mode with equivalent information;
5. prove no continuous idle RAF and complete teardown;
6. measure eager and lazy bundle deltas;
7. compare 320, 390, 768, 1024, and 1440 layouts;
8. retain the existing semantic renderer until an independent visual and
   educational review approves replacement.

## Proposed sequence

### Phase 2A — classification

- Review all current Figure families with educators and beginner users.
- Record KEEP/HYBRID/CANDIDATE decisions and reasons.
- Re-audit current ThreeUI package source before any prototype.

### Phase 2B — one bounded prototype

- Select at most one HYBRID candidate.
- Use real application data and existing product adapters.
- Keep current SVG/DOM renderer available as the control.
- Capture comprehension, accessibility, lifecycle, and bundle evidence.

### Phase 2C — decision

- Accept, revise, or reject the prototype through a new ADR.
- Authorize production work only when evidence beats the current Figure.
- Repeat for another candidate only through a separate scoped increment.

## Explicit exclusions

Phase 2 planning does not add:

- decorative Home or Learn WebGL;
- package demo iframe content;
- hard-coded English package copy;
- mock traces or TypeScript inference;
- new tensor scenes;
- progress persistence;
- backend, CDN, WebGPU, or threaded inference;
- replacement of semantic SVG/DOM Figures;
- changes to model weights, tokenizer, generation, replay, or Worker protocol.

## Exit criteria for planning

Planning is complete when every Figure family has an evidence-backed
classification, one prototype candidate is named or all are rejected, and a
new ADR defines whether implementation may begin.
