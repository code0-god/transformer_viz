# ADR 0005: Autoregressive generation and step replay

- Status: Accepted
- Date: 2026-08-22

ADR 0004 already records reproducible static deployment, so this decision uses the next available
number instead of creating a second ADR 0004.

## Context

The existing Guided Learning Player inspects one forward pass and next-token distribution. It does
not show the defining language-model loop: select one token, append it to context, run the model
again, and repeat. A learner also cannot select an earlier generated token and inspect the exact
context, tensors, logits, and sampling decision that produced it.

The educational model has a 24-token context, no KV cache, and a byte-oriented tokenizer. Saving
every tensor from every generation step would waste browser memory. Re-sampling during inspection
would risk selecting a different token and falsifying the historical generation step.

## Decision

Run generation inside the Rust WASM Worker. Each step performs a full forward over the current
context, transforms final-position logits through explicit Temperature, Top-K, Softmax, and Greedy
or deterministic seeded categorical selection, emits one `TokenGenerated` response, appends the
selected token, then yields before the next step.

Store only a compact `GenerationStepSummary`: step index, context token IDs, selected token,
selected logit/probability, Top-K candidates, deterministic random value and cumulative interval,
and timings. Stop on EOS, configured maximum, context limit, user cancellation, replacement, or
error. Reject stale `request_id` and `run_id` responses at both Worker and UI boundaries.

Selecting a generated token sends `InspectGenerationStep`. The Worker uses the stored pre-selection
context to run one traced forward without sampling again. The selected token remains the historical
summary value. Replay logits and Top-K must match generation within the existing numerical
tolerance.

Render one config-driven Architecture Map with GPT, Block, Attention, and Generation levels.
Guided and Explore select the same architecture-node state, Main Canvas, Inspector, and source
mapping. The final curriculum steps show Generated Token, Append to Context, position growth, full
forward repeat, and the absence of KV-cache reuse.

Use “text generation”, “generated continuation”, and “generated token”. Do not present output as an
assistant answer or instruction-following response.

## Consequences

Generation remains static-only, same-origin, and off the UI thread. Deterministic replay is possible
without retaining full tensors for every step. Stop/new-generation handling requires cooperative
Worker yielding between forwards. Generation ends before `block_size`; no hidden sliding window is
introduced. Generated text quality remains limited by the small educational checkpoint.

Sampling follows this Rust implementation and is source-linked to nanoGPT `generate()` only where
the algorithms correspond. Differences are described rather than presented as parity.

## Rejected alternatives

- Store every step's complete trace: rejected for browser memory cost.
- Re-run sampling during inspection: rejected because it can change historical selection.
- Generate on the Leptos main thread: rejected because it blocks interaction and painting.
- Add a backend, external API, WebGPU, or KV cache: rejected by project scope.
- Treat highest Top-K item as generation: rejected because it omits configured sampling behavior.
