# Visualization architecture

Transformer Viz uses two rendering systems for two kinds of teaching evidence.

```text
Learning Concept
  |
  +-- Explanation
  |     `-- semantic HTML and KaTeX
  |
  +-- Architecture
  |     `-- deterministic SVG
  |
  `-- Data Visualization (optional capability)
        |
        +-- typed renderer registry
        +-- lazy Three.js/R3F scene
        `-- equivalent accessible HTML fallback
```

## Rendering boundary

### SVG and DOM

Use SVG/DOM for:

- Course diagrams
- token flow
- GPT Architecture
- Transformer Block
- Self-Attention computation graph
- arrows and residual paths
- Korean labels
- KaTeX formulas
- breadcrumbs
- curriculum navigation
- Diagram viewport controls and semantic node interaction

SVG answers:

> Transformer에서 어디서 어떤 연산이 일어나는가?

### Three.js and React Three Fiber

Use Three.js/R3F only for actual numerical evidence:

- Embedding values
- Q/K/V features
- attention scores
- causal mask
- softmax probabilities
- value aggregation
- head comparison

Three.js answers:

> 그 연산 안에서 실제 숫자들이 어떻게 변하는가?

## Concept capability

Visualization is optional metadata on a learning concept.

```ts
type VisualizationKind =
  | "score-matrix-3d"
  | "qkv-features"
  | "causal-mask"
  | "softmax"
  | "value-aggregation";

interface VisualizationDefinition {
  readonly id: string;
  readonly kind: VisualizationKind;
  readonly title: string;
  readonly description: string;
}
```

Only a concept with a registered definition shows `설명` and `시각화` tabs.
Generic Guide code never imports Three.js and never switches on visualization
kind.

## Renderer registry

```text
VisualizationDefinition
  -> VisualizationRendererRegistry
  -> lazy renderer module
  -> ThreeVisualizationSurface
  -> scene plus HTML fallback
```

The registry rejects unsupported kinds with a controlled local state. Literal
dynamic imports let Vite produce base-aware chunks for root and GitHub Pages
subpath builds.

## ThreeVisualizationSurface

The shared surface owns:

- local lazy loading
- WebGL capability detection
- renderer error boundary
- context-loss state and retry
- DPR policy
- reduced-motion policy
- compact controls
- HTML fallback placement

It does not own:

- Worker requests
- architecture navigation
- score validation
- selected layer/head state
- concept routing

## Score Matrix data flow

```text
Lab generation
  -> selected historical step
  -> generation_step_trace RunSummary
  -> Learn Self-Attention Visualization
  -> inspect_attention_head(run, layer, head)
  -> AttentionHeadTrace.raw_scores
  -> selected-head T x T view model
  +-- HTML score table
  `-- lazy Score Matrix 3D renderer
```

No replay means no score values. The UI links to Lab instead of synthesizing a
matrix. A pending or failed inspection stays local to the visualization panel.

## Score semantics

- horizontal axis: key position
- depth axis: query position
- zero plane: raw score zero
- upward height: positive score
- downward height: negative score
- color: negative, neutral, positive
- outline: persistent selected cell
- exact text: selected query, key, score, and later causal-mask status

Height is normalized only for presentation. The HTML table preserves exact
Worker values.

## Performance

- Canvas is lazy and absent from initial Learn/Home bundles.
- `frameloop="demand"` avoids idle 60fps work.
- DPR is clamped to 1-2.
- Current maximum matrix is `24 × 24`.
- Geometry/material ownership stays inside the lazy scene.
- Controls invalidate only after interaction.
- Unmount removes controls and context listeners.

## Accessibility and fallback

Canvas never carries unique information. The HTML table remains available with:

- caption
- query row headers
- key column headers
- exact finite values
- causal-mask status
- selected-cell summary

WebGL unsupported, context loss, lazy import failure, or renderer failure leaves
the Guide and SVG architecture usable.

## Milestone boundary

Implemented now:

- generic visualization contract
- generic renderer registry
- shared Three visualization surface
- one Score Matrix 3D renderer
- actual trace binding
- HTML table fallback

Not implemented:

- Q/K/V explorer
- Scale animation
- causal-mask animation
- softmax animation
- value aggregation
- embedding projection
- all-head dashboard
- animation timeline
- Encoder-Decoder or Cross-Attention
- production Tensor Inspector
