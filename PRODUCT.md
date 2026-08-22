# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Rust 1.94.0, Leptos CSR, WebAssembly, Rust Web Worker, Candle CPU f32 inference, Trunk 0.21.14,
SVG, HTML, and CSS. Deployment is static-only and supports both root hosting and a GitHub Pages
project subpath.

## Users

Primary users are Korean-speaking learners who understand basic programming or machine-learning
terms but cannot yet follow a Transformer forward pass from tensor to tensor. They use the app to
connect a selected token, layer, head, and attention cell to real model values and source code.

## Product Purpose

Transformer Viz makes one tiny nanoGPT-compatible Transformer forward pass inspectable. Success
means a learner can move through nine guided concepts and explain what the selected layer, head,
query, and key are doing without first decoding an instrumentation dashboard.

## Positioning

The product teaches with the real browser-executed model trace: actual embedding, LayerNorm,
Q/K/V, score, mask, probability, value aggregation, residual, MLP, final normalization, logits,
and source correspondence. It does not substitute mock traces, decorative animation, or
pre-authored replay data.

## Operating Context

Users open one static URL, wait for Worker and model readiness, run a sentence, then navigate the
guided stages with keyboard or pointer controls. They may inspect exact tensor values and pinned
nanoGPT/Rust source without leaving the current learning stage. The default educational prompt is
`the cat sat on the`.

## Capabilities and Constraints

- Tiny educational model: 2 blocks, 4 heads, embedding width 64, context length 24, vocabulary 259.
- Batch size 1, CPU f32, explicit causal attention, tied token embedding and language-model head.
- Input is limited to 24 byte-fallback tokens including boundaries.
- Model weights, tokenizer, pinned nanoGPT submodule, and Python golden fixtures are immutable for
  the Guided Learning Player redesign.
- Runtime assets remain same-origin. No backend, external API, server inference, CDN, WebGPU, or
  thread-based inference is introduced.
- React, TypeScript, D3, npm frontend dependencies, Canvas-only information, mock traces, and
  arbitrary JSON replay are outside product scope.
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
- Pre-redesign Chrome evidence: `.omo/evidence/guided/baseline/`
- Existing complete repository gate: `scripts/check.sh`

No testimonials, customer claims, production-scale benchmarks, or broad model-quality claims are
available and none may be fabricated.

## Product Principles

1. Teach one concept at a time; keep current operation unmistakable.
2. Use real trace values first; statistics and source are supporting evidence.
3. Preserve continuity across score, mask, softmax, value aggregation, and residual flow.
4. Keep model computation and numerical parity independent from UI navigation.
5. Make exact tensor detail available without forcing every learner to see it at once.

## Accessibility & Inclusion

Target WCAG 2.2 AA. All controls require keyboard access and visible focus. Query, key, selected,
completed, future, and masked states must remain distinguishable without color alone. SVG
visualizations need text alternatives and equivalent HTML values. Motion is user-controlled,
supports reduced-motion preferences, and never carries exclusive meaning.
