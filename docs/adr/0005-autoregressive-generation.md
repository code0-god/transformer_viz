# ADR 0005: Autoregressive generation and step replay

- Status: Accepted for Worker generation/replay; curriculum UI superseded by ADR 0006
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

`Generate` authorizes the first forward. Every later forward requires one typed
`ContinueGeneration` credit carrying the exact `request_id`, `run_id`, and preceding step index.
The UI sends that credit only after accepting the matching contiguous `TokenGenerated` response.
Continue, Stop, and replacement requests share the same main-to-Worker channel, so a control
request can be overtaken by at most one already-authorized non-preemptible forward. Duplicate,
stale, future-index, and post-terminal credits are no-ops. Worker-local timers and self-message
loops are not used because browser task-source selection does not provide cancellation ordering.

Store only a compact `GenerationStepSummary`: step index, context token IDs, selected token,
selected logit/probability, Top-K candidates, deterministic random value and cumulative interval,
and timings. Stop on EOS, configured maximum, context limit, user cancellation, replacement, or
error. Reject stale `request_id` and `run_id` responses at both Worker and UI boundaries.

Selecting a generated token sends `InspectGenerationStep`. The Worker uses the stored pre-selection
context to run one traced forward without sampling again. The selected token remains the historical
summary value. Replay logits and Top-K must match generation within the existing numerical
tolerance.

Render one config-driven React architecture surface with Root, Transformer Block, and
Self-Attention drill-down beside Prompt, Generate, Stop, continuation, and selected-step replay.
Architecture navigation remains browser-only state; replay asks the Worker for retained evidence.

Use “text generation”, “generated continuation”, and “generated token”. Do not present output as an
assistant answer or instruction-following response.

## Consequences

Generation remains static-only, same-origin, and off the UI thread. Deterministic replay is possible
without retaining full tensors for every step. Stop/new-generation handling requires cooperative
Worker yielding between forwards. Generation ends before `block_size`; no hidden sliding window is
introduced. Generated text quality remains limited by the small educational checkpoint.

Sampling follows this Rust implementation. Corresponding nanoGPT generation policy may be explained
in prose, but the canonical ten-entry `source_map.json` remains authoritative and no sampling
`OperationId` or source ID is invented. Differences are described rather than presented as parity.

## Rejected alternatives

- Store every step's complete trace: rejected for browser memory cost.
- Re-run sampling during inspection: rejected because it can change historical selection.
- Generate on the Leptos main thread: rejected because it blocks interaction and painting.
- Schedule later forwards with Worker-local timers or self-messages: rejected because they do not
  order generation work against Stop or replacement messages on another task source.
- Add a backend, external API, WebGPU, or KV cache: rejected by project scope.
- Treat highest Top-K item as generation: rejected because it omits configured sampling behavior.
