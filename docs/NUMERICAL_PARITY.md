# Numerical parity report

## Fixture provenance

- Producer: `tools/reference/generate_golden.py`, importing pinned `reference/nanoGPT/model.py`.
- nanoGPT commit: `3adf61e154c3fe3fca428ad6bc3818b27a3b8291`.
- Deterministic seed: `20260821`.
- Golden/parity fixture prompt: `the cat sat on the`.
- Prompt token IDs: `[0, 119, 107, 104, 35, 102, 100, 119, 35, 118, 100, 119, 35, 114, 113, 35, 119, 107, 104, 1]`.
- Model SHA-256: `8fd76c662da0d0cb9fe1035cb205b1a071ad95f9e22d116578a0a8bec0754be9`.
- Trace SHA-256: `b441b99f8392b80784adadcc249a961b148908012ec4ee15f473494c6d5e5f56`.
- Config SHA-256: `a81ea5a170d8dd7f75064b4962076d0d54adcc55440bc98aed9c52c664b99c64`.
- Tokenizer SHA-256: `dd6f35a39cd126462a8d34f9e2832cca2ae2851fb7290761ab63dd2c3fbf572e`.
- The fixture is committed Python output; Rust does not generate or round it.

## Comparison contract

Native Candle CPU f32 output is compared elementwise with absolute and relative tolerance `1e-4` using `abs(error) <= 1e-4 + 1e-4 * abs(Python)`. No operation uses a relaxed tolerance. Relative maxima can exceed `1e-4` near zero while absolute error remains well below the contract. Shapes must match exactly. Token IDs, causal masks, future-zero cells, and Top-K IDs must match exactly; every probability row must sum to one within `1e-4`.

## Measured native errors

| Tensor | Max absolute error | Max relative error |
|---|---:|---:|
| `token_embeddings` | `0.00000000e0` | `0.00000000e0` |
| `position_embeddings` | `0.00000000e0` | `0.00000000e0` |
| `embedding_sum` | `0.00000000e0` | `0.00000000e0` |
| `final_layer_norm` | `1.07288361e-6` | `2.71806843e-4` |
| `logits` | `2.86102295e-6` | `5.71916826e-5` |
| `last_token_logits` | `1.43051147e-6` | `3.65582309e-6` |
| `layer.0.input` | `0.00000000e0` | `0.00000000e0` |
| `layer.0.ln_1` | `3.57627869e-7` | `4.84077009e-6` |
| `layer.0.query` | `2.38418579e-7` | `6.17013502e-5` |
| `layer.0.key` | `3.57627869e-7` | `6.60944497e-4` |
| `layer.0.value` | `1.49011612e-7` | `3.30308321e-5` |
| `layer.0.raw_scores` | `1.90734863e-6` | `2.03641648e-5` |
| `layer.0.scaled_scores` | `4.76837158e-7` | `2.03641648e-5` |
| `layer.0.probabilities` | `5.96046448e-8` | `6.64189315e-7` |
| `layer.0.attention_output` | `8.94069672e-8` | `2.60320399e-3` |
| `layer.0.merged` | `8.94069672e-8` | `2.60320399e-3` |
| `layer.0.projected` | `2.23517418e-8` | `2.81336688e-5` |
| `layer.0.attention_residual` | `2.98023224e-8` | `2.79084052e-5` |
| `layer.0.ln_2` | `7.15255737e-7` | `1.09037370e-4` |
| `layer.0.mlp_hidden` | `4.17232513e-7` | `3.80945596e-4` |
| `layer.0.mlp_activated` | `4.17232513e-7` | `3.80824815e-4` |
| `layer.0.mlp_output` | `2.98023224e-7` | `9.40309328e-5` |
| `layer.0.output` | `2.98023224e-7` | `8.29875498e-5` |
| `layer.1.input` | `2.98023224e-7` | `8.29875498e-5` |
| `layer.1.ln_1` | `1.19209290e-6` | `1.11641930e-4` |
| `layer.1.query` | `4.17232513e-7` | `1.69241848e-5` |
| `layer.1.key` | `3.57627869e-7` | `5.13093619e-5` |
| `layer.1.value` | `2.38418579e-7` | `2.23573370e-4` |
| `layer.1.raw_scores` | `2.38418579e-6` | `1.32576431e-4` |
| `layer.1.scaled_scores` | `5.96046448e-7` | `1.32576431e-4` |
| `layer.1.probabilities` | `1.78813934e-7` | `5.66960125e-7` |
| `layer.1.attention_output` | `1.93715096e-7` | `2.09732374e-4` |
| `layer.1.merged` | `1.93715096e-7` | `2.09732374e-4` |
| `layer.1.projected` | `5.96046448e-8` | `3.05957953e-3` |
| `layer.1.attention_residual` | `2.68220901e-7` | `1.77443144e-4` |
| `layer.1.ln_2` | `1.19209290e-6` | `9.18249891e-4` |
| `layer.1.mlp_hidden` | `3.57627869e-7` | `1.57605071e-4` |
| `layer.1.mlp_activated` | `4.76837158e-7` | `1.57445131e-4` |
| `layer.1.mlp_output` | `2.98023224e-7` | `7.11025030e-4` |
| `layer.1.output` | `2.98023224e-7` | `5.66609706e-5` |

Exact checks: token IDs loaded from `tokens`; both layer masks match; all attention rows sum to one; every future probability is zero; final Top-3 IDs are `[112, 107, 1]` in both implementations.

The largest measured absolute error is `2.86102295e-6` (`logits`), below the initial `1e-4` tolerance. WASM uses the same Rust/Candle f32 forward implementation; Phase F verifies target compilation rather than claiming an unmeasured browser-runtime error delta.
