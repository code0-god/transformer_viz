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

## Shipped fourteen-Chapter visual story

| Chapter | Renderer | Canonical verb | Primary relation |
| --- | --- | --- | --- |
| 0.1 NLP | R3F + DOM/SVG fallback | TRANSFORMATION | text → representation → computation → result |
| 0.2 Token | R3F + DOM/SVG fallback | SEGMENTATION | one strip → ordered token boundaries |
| 0.3 Vocabulary and ID | R3F + DOM/SVG fallback | ADDRESSING | token → vocabulary slot → ID |
| 0.4 Tokenization | R3F + DOM/SVG fallback | RESEGMENTATION | persistent text, changed boundaries |
| 1.1 Language Model | R3F + DOM/SVG fallback | FAN-OUT | one context → candidate field |
| 1.2 Next Token | R3F + DOM/SVG fallback | TRANSFORMATION | logit → probability → selection |
| 1.3 Conditional Probability | R3F + DOM/SVG fallback | ACCUMULATION | growing conditioned prefix |
| 1.4 Autoregressive Generation | R3F + DOM/SVG fallback | GROWING LOOP | select → append → updated context |
| 2.1 Token Embedding | R3F + DOM/SVG fallback | LOOKUP | ID → selected row → vector |
| 2.2 Position Embedding | R3F + DOM/SVG fallback | COMPOSITION | channel-aligned element-wise addition |
| 2.3 Hidden State | R3F + DOM/SVG fallback | EVOLUTION | fixed `[T,C]`, changed values |
| 3.1 GPT | R3F + DOM/SVG fallback | PIPELINE | context → blocks → token → context update |
| 4.1 Transformer Block | R3F + DOM/SVG fallback | RESIDUAL | exact Pre-LN path and two bypasses |
| 5.1 Self-Attention | R3F + DOM/SVG fallback | ATTENTION | Q/K/V → scores → mask → weights → value |

Lab Score Matrix stays separate: R3F plus exact HTML from correlated Worker
trace values. Learn scenes are illustrative, never synthetic runtime evidence.

## Shared policy

- one concept question and one primary Figure per Chapter;
- ThreeUI controls remain below the learning stage;
- labels and formulas remain crisp DOM/KaTeX, never textures;
- scene-specific lazy chunks and one deduplicated R3F vendor chunk;
- visible-only Canvas ownership and `frameloop="demand"`;
- settled/offscreen RAF delta zero;
- reduced motion jumps to the same meaningful state;
- WebGL, import, renderer, or context failure preserves the learning point;
- no shared Canvas, external model, texture, particle, bloom, or shader-heavy
  pipeline.

## Deferred decisions

- actual runtime tensor mode inside Learn;
- all-head actual attention comparison;
- encoder-decoder and cross-attention;
- training visualization;
- production Tensor Inspector;
- shared-Canvas architecture without measured need.

No deferred item is authorized without its own semantic fallback, lifecycle,
bundle, accessibility, and production-browser review.
