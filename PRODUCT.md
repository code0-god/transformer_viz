# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19, strict TypeScript, Vite 8, KaTeX 0.18, Three.js 0.185, React Three Fiber 9.7,
Rust 1.94.0, WebAssembly, a Rust module Web Worker, Candle CPU f32 inference, SVG, HTML, and CSS.
Deployment is static-only and supports both root hosting and a GitHub Pages project subpath.

## Users

Primary users are Korean-speaking beginners who need a clear path from ordinary text to
Transformer concepts. They may know basic programming, but the course never assumes prior
knowledge of tokenization, language modeling, GPT, Transformer Blocks, or Self-Attention.
Advanced learners can use the model Lab to connect generated tokens to architecture, math,
tensors, sampling, and source code. A capable Learn concept may expose one optional data
visualization beside its explanation; architecture and formulas remain semantic SVG, DOM, and
KaTeX.

## Product Purpose

Transformer Viz teaches a staged decoder-only Transformer course, then provides a model Lab for
testing those ideas against a real tiny nanoGPT-compatible runtime. Success begins when a first-time
learner immediately knows where to start and can explain why language must become numeric
representations before a neural model can calculate with it. Later success means connecting one
generated token to context, architecture, attention, logits, and sampling.

## Positioning

The product teaches with real Worker-executed generation and model traces: actual embedding,
LayerNorm, Q/K/V, score, mask, probability, value aggregation, residual, MLP, final
normalization, logits, temperature, Top-K, categorical sampling, context append, and source
correspondence. It does not substitute mock generation, decorative animation, or pre-authored
replay data. It describes output as text generation or a generated continuation, never as an
assistant answer.

## Operating Context

Users open one static URL at Course Home, start Chapter 0.1 with one primary action, optionally
open Lab through its outlined route, and move through URL-addressable Chapters. Learn hides
model-generation controls and uses a centered explanation-first article. Large SVG and R3F
visuals are absent from the reading surface until a concept-specific action opens the shared
focused viewer. Lab preserves Prompt, Generate, Stop, Continuation, Replay, sampling settings,
trace, and Architecture inside the existing React and Worker state, but presents them as one
experiment-first flow with on-demand inspection viewers instead of a permanent architecture
pane. The default Lab prompt is `the cat`; the legacy `the cat sat on the` phrase remains only as
the full-forward golden/parity fixture.

## Capabilities and Constraints

- Tiny educational model: 2 blocks, 4 heads, embedding width 64, context length 24, vocabulary 259.
- Batch size 1, CPU f32, explicit causal attention, tied token embedding and language-model head.
- Prompt and generated context are limited by `block_size`; generation stops before overflow
  rather than introducing an implicit sliding window.
- Generation supports Greedy or deterministic seeded Sample mode, max-new-token, temperature,
  and Top-K settings. Invalid UI values are clamped at the trust boundary.
- Generation stores compact step summaries. Detailed tensors are reconstructed only when a user
  selects a generation step.
- This educational runtime has no KV cache. Every new token runs the full current context through
  the Transformer again.
- Model weights, tokenizer, pinned nanoGPT submodule, and Python golden fixtures are immutable for
  the Interactive Learning Lab redesign.
- Runtime assets remain same-origin. No backend, external API, server inference, CDN, WebGPU, or
  thread-based inference is introduced.
- D3, Canvas-only information, mock traces, arbitrary JSON replay, and TypeScript numerical
  inference are outside product scope.
- WebGL is an optional, lazy numerical-evidence layer. This milestone implements only the actual
  attention Score Matrix; decorative scenes and three-dimensional architecture are outside scope.
- The Score Matrix Canvas uses demand-driven rendering and bounded controls. Its exact Worker
  values remain available in an accessible HTML table when WebGL is unavailable or interrupted.
- The model is nanoGPT-compatible, not GPT-2 124M and not a general-purpose language model.

## Brand Commitments

Keep the name `Transformer Viz`, Korean instructional voice, factual model language, and the
existing warm scientific-notebook identity. Explanation must remain precise rather than magical,
competitive, or promotional.

## Evidence on Hand

- Real model and tokenizer assets: `assets/models/edu/`
- Python/Rust parity report: `docs/NUMERICAL_PARITY.md`
- Pinned source map and license records: `reference/NANOGPT_SOURCE.md`,
  `THIRD_PARTY_NOTICES.md`
- Existing architecture and trace contracts: `docs/ARCHITECTURE.md`,
  `docs/TRACE_SCHEMA.md`
- Existing complete repository gate: `scripts/check.sh`

No testimonials, customer claims, production-scale benchmarks, or broad model-quality claims are
available and none may be fabricated.

## Product Principles

1. Teach one concept at a time; keep current operation unmistakable.
2. Use real trace values first; statistics and source are supporting evidence.
3. Preserve continuity across score, mask, softmax, value aggregation, and residual flow.
4. Keep model computation and numerical parity independent from navigation and sampling UI.
5. Make exact tensor detail available without retaining every generation step's full trace.
6. Separate model prediction from generation strategy: Temperature, Top-K, and Sampling are not
   Transformer Block operations.
7. Show that a generated token enters attention only on the following generation step.
8. Make the append-and-repeat loop visible; never imply hidden KV-cache reuse.
9. Start with course wayfinding, not an inference console or Architecture fallback.
10. Give each Chapter one H1 and one explicit scroll owner per responsive layout.
11. Store Home, Chapter, and Lab location in a static-host-safe hash route.
12. Let SVG explain where computation happens; use Three.js only when real tensor values benefit
    from a spatial encoding.

## Accessibility & Inclusion

Target WCAG 2.2 AA. All controls require keyboard access and visible focus. Query, key, selected,
completed, future, and masked states must remain distinguishable without color alone. SVG
visualizations need text alternatives and equivalent HTML values. WebGL visualizations must keep
an exact HTML fallback mounted and isolate loading, capability, renderer, and context-loss
failures. Motion is user-controlled, supports reduced-motion preferences, and never carries
exclusive meaning.
