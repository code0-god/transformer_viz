# Architecture Notation

This document is the canonical source for user-visible operation, tensor, and shape notation in
Transformer Viz. Root Architecture, Transformer Block Detail, Self-Attention Detail, and generation
copy must use these rules.

## Operation symbols

| Meaning | Canonical notation |
|---|---|
| Repeated Transformer Blocks | `× N`, or concrete `× 2` from config |
| Tensor matrix multiplication | `@` |
| Matrix multiplication operation | `MatMul` |
| Vector dot product | `·` |
| Residual or element-wise addition | `+` |
| Scalar division | `/` |
| Head concatenation | `Concat` or `Merge Heads` |
| Transpose | `ᵀ` |
| Element-wise multiplication | `⊙`, only when required |

`×` is reserved for Block repetition. It never denotes attention matrix multiplication. Linear
layers remain `Linear`, because they may include bias:

```text
QKV Projection
Linear: [T, C] → [T, 3C]

Output Projection
Linear: [T, C] → [T, C]
```

Pure Tensor products use `MatMul`:

```text
Score MatMul
S_h = Q_h @ K_hᵀ

Value MatMul
Y_h = A_h @ V_h
```

## Dimension symbols

| Symbol | Meaning |
|---|---|
| `N` | Transformer Block count |
| `B` | batch size |
| `T` | current sequence length |
| `C` | model or embedding dimension |
| `H` | attention head count |
| `D` | head dimension, `D = C / H` |
| `Vocab` | vocabulary size |
| `h` | selected head index |
| `i` | Query token position |
| `j` | Key token position |
| `k` | Top-k candidate count |
| `τ` | temperature |

`K` is the Key Tensor; lowercase `k` is Top-k. `T` is sequence length; `τ` is temperature. `V` is
the Value Tensor; vocabulary size is always `Vocab`.

## Tensor symbols

### Root

| Symbol | Meaning |
|---|---|
| `X₀` | hidden state entering Block 0 |
| `X_N` | hidden state after all `N` Blocks |

### Transformer Block

| Symbol | Meaning |
|---|---|
| `X_in` | Block input |
| `X_LN1` | LayerNorm 1 output |
| `Y_attn` | Self-Attention output |
| `X_res1` | first residual result |
| `X_LN2` | LayerNorm 2 output |
| `Y_MLP` | MLP output |
| `X_out` | Block output |

Canonical Block equations:

```text
X_LN1 = LN1(X_in)
Y_attn = Attention(X_LN1)
X_res1 = X_in + Y_attn
X_LN2 = LN2(X_res1)
Y_MLP = MLP(X_LN2)
X_out = X_res1 + Y_MLP
```

### Self-Attention

| Symbol | Meaning |
|---|---|
| `X` | attention input, equal to selected Block `X_LN1` |
| `Z_qkv` | combined QKV projection output |
| `Q`, `K`, `V` | Query, Key, Value Tensors |
| `Q_h`, `K_h`, `V_h` | selected head Tensors |
| `S_h` | attention scores |
| `S_h^scaled` | scaled scores |
| `S_h^masked` | causally masked scores |
| `A_h` | attention probabilities or weights |
| `Y_h` | selected head output |
| `Y_merge` | concatenated head outputs |
| `Y_attn` | final attention output |

Canonical attention equations:

```text
Z_qkv = Linear_qkv(X)
Q, K, V = Split(Z_qkv)
S_h = Q_h @ K_hᵀ
S_h^scaled = S_h / √D
S_h^masked = CausalMask(S_h^scaled)
A_h = softmax(S_h^masked)
Y_h = A_h @ V_h
Y_merge = Concat(Y_0, …, Y_{H-1})
Y_attn = Linear_out(Y_merge)
```

One-line summary:

```text
Y_h = softmax(CausalMask(Q_h @ K_hᵀ / √D)) @ V_h
```

## Symbolic and actual shapes

Main Architecture diagrams show symbolic shape only:

```text
[T, C]
[H, T, D]
[T, T]
```

Current model and trace values appear only in explanation panels:

```text
Symbolic shape
[H, T, D]

Current shape
[4, 18, 16]

Full tensor shape
[1, 4, 18, 16]
```

Never mix symbolic and concrete values in one diagram line:

```text
[T, C] = [T, 64]       forbidden
[H, T, D] = [4, T, 16] forbidden
```

## Batch dimension

Architecture diagrams omit batch:

```text
X [T, C]
Q [H, T, D]
S [H, T, T]
```

Current Shape or Tensor detail may include batch:

```text
X [B, T, C]
Q [B, H, T, D]
S [B, H, T, T]
```

Current educational inference uses `B = 1`, but diagrams do not repeat `[1, ...]`.

## Current values

Values must come from validated model config and the selected trace:

```text
N = config.n_layer
C = config.n_embd
H = config.n_head
D = C / H
Vocab = config.vocab_size
T = selected trace sequence length
```

If no trace is selected, `T` and every T-dependent current shape display `—` or `실행 후 표시`.
`block_size` is context capacity, not current `T`.

## Screen contracts

### Root Architecture

```text
Hidden State X₀
[T, C]

Transformer Block × N

Hidden State X_N
[T, C]

Final LayerNorm
```

The current configured Block count may replace `N`, for example `Transformer Block × 2`.

### Transformer Block Detail

Nodes use the canonical Block equations above. Residual circles retain `+`. Legacy local symbols
`x`, `x′`, and `y` do not appear.

### Self-Attention Detail

Each diagram node contains at most two lines: operation name, then either symbolic formula or
symbolic shape. Concrete dimensions remain in the explanation panel.

### Generation

| Concept | Symbol |
|---|---|
| Vocabulary size | `Vocab` |
| Temperature | `τ` |
| Top-k candidate count | `k` |
| Selected token index | `i_next` |

Generation policy stays separate from Transformer matrix operations.

## Accessibility

Visible symbols never carry meaning alone. Accessible names include operation meaning:

```text
Score MatMul, Query와 전치된 Key의 행렬곱
Value MatMul, attention probability와 Value의 행렬곱
Scale, score를 head dimension 제곱근으로 나누기
```

## Forbidden notation

- `Q × Kᵀ`
- `× V`
- lowercase `x` as multiplication
- mixed symbolic and actual shape in one diagram line
- concrete `1 / √16` inside a diagram node
- `K` for Top-k
- `V` for vocabulary size
- invented `T` before a real trace exists
- Block-local `x`, `x′`, or `y` without canonical Tensor names

Golden fixture IDs, persisted trace contracts, and nanoGPT source identifiers are not renamed by
this presentation contract.
