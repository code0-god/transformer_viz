# Final verification

This document records the final acceptance of the static `transformer_viz` MVP. Detailed command
logs, action traces, network events, screenshots, checksums, sizes, and cleanup receipts live under
the local ignored `.omo/evidence/` tree.

## Accepted tree

- Production repair baseline: `454a804c5cc0bb66e72047c76503cac8b91c438e`
- Rust: `1.94.0`
- Trunk: `0.21.14`
- nanoGPT reference: `3adf61e154c3fe3fca428ad6bc3818b27a3b8291`
- Model: 118,208 learned parameters; 475,432-byte tied-weight safetensors
- Model SHA-256: `8fd76c662da0d0cb9fe1035cb205b1a071ad95f9e22d116578a0a8bec0754be9`
- Root release size: 3.1 MiB, below the recommended 30 MiB budget

## C001 happy path

Real Google Chrome loaded the root static release, waited for `준비 완료`, ran
`the cat sat on the`, and selected layer 1, head 1, token 4. Clicking heatmap cell q4×k2 and
pressing `ArrowRight` selected and focused q4×k3. Playback `다음` advanced to step 2; selecting
the QK transpose step synchronized the source panel from `Block.forward` to
`CausalSelfAttention.forward`.

The page displayed real Worker-produced Q, K, V, raw QK transpose, scaled scores, causal mask,
softmax probabilities, Attention × V, residuals, MLP values, tensor statistics, and Top-10 logits.
Both desktop 1440×1000 and mobile 390×844 completed with 18 trace operations, 18 playback steps,
no horizontal overflow, no external request, no console error, no page exception, and a responsive
main thread.

## C002 edge and adversarial behavior

Chrome observed Korean typed errors for empty input, more than 24 tokens, missing weights, and a
bad SHA-256 manifest. Empty and overlength submissions cleared stale traces and recovered through a
valid rerun. The controlled missing-weight response produced HTTP 404 without panic. The checksum
case displayed expected and actual hashes at 390×844 with document width equal to viewport width.

Focused Rust tests also cover invalid layer/head/token selectors, stale run IDs, cancellation,
non-finite serialization rejection, causal future probability exactly zero, and softmax row sums
within floating-point tolerance.

## C003 regression and deployment

`./scripts/check.sh` passed on the repaired tree, including rustfmt, strict Clippy, all workspace
tests, root workspace release, WASM check, canonical asset checksums, forbidden dependency checks,
and a namespaced root Trunk release. The golden parity integration passed every required tensor and
Top-K comparison with combined absolute/relative tolerance `1e-4`; maximum absolute error was
`2.86102295e-6`.

Independent root and `/transformer_viz/` builds passed with isolated output directories. Chrome
served each bundle and received HTTP 200 for app/Worker JavaScript and WASM plus
manifest/config/tokenizer/weights beneath the correct same-origin base path. Concurrent isolated
root/subpath builds also passed, proving the repaired build-output race is closed.

## Cleanup

Final QA closed Chrome and both static servers, removed namespaced build outputs and temporary
profiles, verified all assigned ports clear, and left `git status --short --branch` clean.
