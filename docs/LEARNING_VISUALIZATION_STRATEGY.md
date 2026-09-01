# Learning Visualization Strategy

## Product rule

Learn is `Article + Interactive Learning Visualization` only when interaction
answers one concept question better than static composition.

A scene is accepted when all are true:

1. depth, selection, or a short transition changes understanding;
2. one written question controls the composition;
3. semantic DOM/SVG can teach the same point without WebGL;
4. values are real evidence or explicitly labeled illustrations;
5. no idle animation, free decoration, or scroll-driven computation is needed.

Otherwise keep the Figure semantic and static.

## Current benchmark

| Chapter | Question | Renderer | Canonical verb | Fallback |
| --- | --- | --- | --- | --- |
| 2.1 Token Embedding | How does one ID find one vector? | R3F scene | LOOKUP | Token row-lookup SVG/DOM |
| 2.2 Position Embedding | How are equal-length token and position vectors combined? | R3F scene | COMPOSITION | Element-wise addition SVG/DOM |
| 2.3 Hidden State | What changes while tensor shape and token rows persist? | R3F scene | EVOLUTION | X_0/X_1/X_N evolution SVG/DOM |

All three use illustrative channel geometry, direct ThreeUI controls, demand
rendering, visible-only Canvas ownership, and scene-specific lazy chunks.

## Complete Figure migration matrix

| Surface | Current renderer | Classification | Future scope |
| --- | --- | --- | --- |
| Part 0.1 NLP process | SVG/DOM | Keep SVG | Static ordered process is sufficient |
| Part 0.2 Token boundary | SVG/DOM | Keep SVG | Boundary concept needs exact labels, not depth |
| Part 0.3 Vocabulary and ID | SVG/DOM | Keep SVG | Relationship diagram remains clearer in 2D |
| Part 0.4 Tokenization comparison | SVG/DOM | Keep SVG | Comparison sheet; no computation animation |
| Part 1.1 Language Model | SVG/DOM | Keep SVG | Architecture-free definition |
| Part 1.2 Next Token | SVG/DOM | Keep SVG | One-step stages and logits/probability distinction |
| Part 1.3 Conditional Probability | SVG/DOM/KaTeX | Keep SVG | Formula and condition relation remain semantic |
| Part 1.4 Autoregressive Generation | SVG/DOM | Keep SVG | State loop is readable without WebGL |
| Part 2.1 Token Embedding | R3F + SVG/DOM | Implemented | LOOKUP benchmark |
| Part 2.2 Position Embedding | R3F + SVG/DOM | Implemented | COMPOSITION benchmark |
| Part 2.3 Hidden State | R3F + SVG/DOM | Implemented | EVOLUTION benchmark |
| GPT Root | SVG | Candidate later | Layered pipeline only; no implementation now |
| Transformer Block | SVG | Candidate later | Residual depth paths only; no implementation now |
| Self-Attention | SVG | Flagship candidate | Decomposed Q/K/V and weighted-value scenes only |
| Lab Score Matrix | R3F + exact HTML | Keep | Actual Worker trace; numeric semantics frozen |

## Phased roadmap

### Current phase

- reusable Learning Scene lifecycle;
- exactly three Part 2 benchmark scenes;
- static semantic fallback for each;
- browser lifecycle, accessibility, performance, and bundle evidence.

### Phase 2 planning only

- retain Part 0 and Part 1 as semantic Figures;
- prototype GPT layered pipeline only if depth improves stage grouping;
- prototype Transformer Block only for residual-path depth;
- treat Self-Attention as a decomposed flagship, never one giant scene;
- preserve one question per Figure.

### Later, separate decisions

- Q/K/V features from actual traces;
- causal-mask and softmax transitions;
- weighted-value aggregation;
- all-head comparison.

No roadmap item authorizes implementation without its own content, fallback,
lifecycle, bundle, and accessibility review.
