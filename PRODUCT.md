# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19, strict TypeScript, Vite 8, KaTeX 0.18, Rust 1.94.0, WebAssembly, a Rust module Web
Worker, Candle CPU f32 inference, SVG, HTML, and CSS. Deployment is static-only and supports both
root hosting and a GitHub Pages project subpath.

## Users

Primary users are Korean-speaking learners who understand basic programming or machine-learning
terms but cannot yet connect autoregressive text generation to one concrete Transformer forward
pass. They use the app to generate a continuation, select any generated token, and follow that
token's context through architecture, math, tensors, sampling, and source code.

## Product Purpose

Transformer Viz shows a tiny nanoGPT-compatible Transformer generating text one token at a time,
then makes the exact forward pass that produced any selected token inspectable. Success means a
learner can explain how context, architecture, attention, language-model logits, and sampling
combined to select that token and why it enters the next step's context.

## Positioning

The product teaches with real Worker-executed generation and model traces: actual embedding,
LayerNorm, Q/K/V, score, mask, probability, value aggregation, residual, MLP, final
normalization, logits, temperature, Top-K, categorical sampling, context append, and source
correspondence. It does not substitute mock generation, decorative animation, or pre-authored
replay data. It describes output as text generation or a generated continuation, never as an
assistant answer.

## Operating Context

Users open one static URL, wait for Worker and model readiness, enter a prompt, choose generation
settings, and watch tokens stream into the continuation. Selecting a generated token replays that
step's stored context without sampling again. Generate and Architecture remain linked inside one
React state. The default educational prompt is `the cat`; the legacy
`the cat sat on the` phrase remains only as the full-forward golden/parity fixture.

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

## Accessibility & Inclusion

Target WCAG 2.2 AA. All controls require keyboard access and visible focus. Query, key, selected,
completed, future, and masked states must remain distinguishable without color alone. SVG
visualizations need text alternatives and equivalent HTML values. Motion is user-controlled,
supports reduced-motion preferences, and never carries exclusive meaning.
