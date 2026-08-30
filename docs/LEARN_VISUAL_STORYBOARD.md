# Learn Visual Storyboard

## Status

- Decision: approved for implementation
- Scope: fourteen canonical Chapters
- Branch baseline: `76e16bf46dd9ae8684b276c515048ca55e9352a9`
- Baseline evidence:
  `.omo/evidence/learn-visual-reboot/baseline/`
- Product mode: Read
- Visual direction: Calibrated Computation Atlas

This storyboard is the implementation gate for Learn Visual Reboot. It keeps
the existing article, SceneFigure lifecycle, Worker, architecture, and Score
Matrix contracts. It replaces the incumbent static-first visual language and
the prototype Part 2 composition.

The fourteen-Chapter spine is `4 + 4 + 3 + 1 + 1 + 1`: Part 0, Part 1,
Part 2, GPT, Transformer Block, and Self-Attention.

## Product decision

Learn is:

```text
Article
+ Interactive Visual Learning Experience
```

Renderer priority:

1. Three.js / R3F for selection, transformation, tensor structure, sequence
   growth, branching, accumulation, and computation flow.
2. DOM / SVG for exact two-dimensional relations, tables, semantic fallback,
   and comparison.
3. KaTeX for trusted formulas.

Three.js earns its place only when the stage explains a relation or change
better than a static composition. Canvas never owns unique learning content.

## Baseline audit

### Technical foundation

Keep:

- `SceneFigure`
- existing Figure registries
- scene-specific lazy imports
- canonical Three/R3F runtime
- two-observer preload and visible activation
- `frameloop="demand"`
- settled idle RAF zero
- reduced motion
- WebGL capability fallback
- lazy/render error isolation
- context loss and restoration
- keyboard and touch alternatives
- lifecycle instrumentation
- semantic SVG/DOM fallbacks

### Product failures

Baseline contact sheets show:

- Part 0 and Part 1 read as static article Figures.
- Part 2 appears as a separate prototype product.
- large dark stages use too little educational geometry;
- cube primitives dominate visual vocabulary;
- controls and state summaries precede the learning object;
- scene labels sit outside the spatial relation;
- GPT remains a static pipeline;
- Transformer Block and Self-Attention lack a primary Chapter visualization;
- mobile captures often reach prose before the concept stage.

Current Part 2 scenes are technical references, not composition references.

## Direction contract

### World

Calibrated Computation Atlas combines Korean technical textbook clarity with
an instrument-grade computation bench. Cool paper remains continuous with the
article. Spatial stages use graphite depth, translucent representation planes,
precise registration lines, and restrained semantic accents.

### First viewport

Chapter identity and one concise learning question lead directly into a
high-information visual stage. Geometry occupies the stage rather than
floating inside it. Stage controls follow the learning object.

### Visitor path

```text
Question
Representation
Meaningful transition or selection
Stable final relation
One-sentence conclusion
```

### Signature interaction

A thin registered step rail marks conceptual state. Selection uses rim,
doubling, depth, or lift. Color reinforces state but never carries it alone.
Replay is a small secondary action.

### Cross-course reach

Visual complexity deepens with curriculum:

```text
representation
segmentation
addressing
prediction
probability
sequence growth
lookup
composition
state evolution
pipeline
residual branch
attention aggregation
```

### Honest risk

Fourteen scenes can become repetitive or expensive. Each Chapter therefore
owns a distinct spatial grammar and scene-specific lazy chunk. Shared
primitives stay limited to repeated semantic objects.

## Shared visual language

### Surface

- article-connected cool neutral stage;
- graphite depth field, not a giant black rectangle;
- low-contrast calibration grid only for matrix or tensor concepts;
- subtle vignette only when it improves foreground separation;
- no bloom, particles, decorative waves, random cubes, or idle drift.

### Semantic colors

| Role | Meaning |
| --- | --- |
| token | persistent token identity |
| position | position-only contribution |
| selected | current row, stage, or candidate |
| output | transformed or extracted result |
| masked | unavailable future relation |
| residual | bypass path and merge |
| query | query representation |
| key | key representation |
| value | value representation |

Every role also has a non-color cue: label, position, rim, pattern, or line
form.

### Shared primitives

- `TokenChip`: crisp token identity with DOM text counterpart.
- `VectorStrip`: channel-aligned vector cells.
- `TensorGrid`: row and channel structure with stable dimensions.
- `MatrixPlane`: query/key interaction field.
- `LayerPlane`: representation or computation layer.
- `SelectionRim`: selected row, token, candidate, or stage.
- `FlowLine`: directed computation path.
- `StageLabel`: DOM overlay tied to a stable stage region.
- `StepRail`: compact native step navigation.

This is not a general visual DSL. Only primitives repeated across real Chapter
scenes belong here.

### Lighting and materials

- one shared readability-first hemisphere/directional lighting setup;
- matte neutral surfaces;
- restrained translucency for overlapping representations;
- emissive edge only for selected state;
- no real-time shadows unless they explain overlap;
- no post-processing.

### Motion language

| Grammar | Transition |
| --- | --- |
| LOOKUP | highlight, lift, extract |
| SEGMENTATION | register, split, settle |
| COMPOSITION | align, approach, merge |
| EVOLUTION | preserve frame, morph values |
| FAN-OUT | branch from one context |
| TRANSFORMATION | preserve identity while encoding changes |
| GROWING LOOP | select, append, return |
| PIPELINE | focus travels through fixed stages |
| RESIDUAL | branch, bypass, merge |
| ATTENTION | project, interact, mask, normalize, aggregate |

Normal transitions use 250–700ms. Complex stage changes may use 700–1200ms.
New input cancels or retargets the current transition. Reduced motion jumps to
the same stable final state.

### Stage anatomy

```text
Question
One-line explanation

Learning Stage
  DOM labels
  educational geometry
  selected state
  spatial relation

Step rail / selectors / replay
One-sentence conclusion
```

Controls never sit as a large button wall above the stage.

## Full fourteen-Chapter storyboard

### 0.1 자연어 처리란?

- Learning question: 언어는 어떻게 계산 가능한 표현이 되어 결과로
  돌아오는가?
- Visual type: Scene.
- Primary renderer: R3F with DOM stage labels.
- Spatial grammar: REPRESENTATION TRANSFORMATION.
- Scene sketch: text ribbon, token/numeric plane, computation field, result
  layer. Each representation uses a different form.
- Interaction: select Text, Representation, Computation, Result.
- Transition: focused representation expands while the previous layer remains
  as context.
- Mobile: vertical four-stage section; one stage focused at a time.
- Fallback: existing ordered SVG pipeline, revised to match labels.
- Why 3D: depth separates representation layers without implying four generic
  boxes.
- Secondary visual: none.
- Conclusion: 모델은 텍스트를 직접 계산하지 않고 수치 표현을 거쳐
  결과를 만듭니다.

### 0.2 Token이란?

- Learning question: 문장은 어떻게 token 단위로 나뉘는가?
- Visual type: Scene.
- Primary renderer: R3F segmentation strip with DOM token text.
- Spatial grammar: SEGMENTATION.
- Scene sketch: one continuous sentence strip physically separates into
  token pieces with stable order.
- Interaction: compare word-like explanation and current byte mode.
- Transition: register, split boundaries, settle with gaps.
- Mobile: wrapped strip; labels never shrink below reading size.
- Fallback: current token-boundary SVG/DOM Figure.
- Why 3D: physical separation makes boundary creation visible.
- Secondary visual: byte-mode truth note tied to current tokenizer.
- Conclusion: Token 경계는 tokenizer가 정하며 단어 경계와 항상 같지
  않습니다.

### 0.3 Vocabulary와 Token ID

- Learning question: Token은 어떻게 vocabulary의 주소를 얻는가?
- Visual type: Scene.
- Primary renderer: R3F indexed rack with DOM row labels.
- Spatial grammar: ADDRESSING.
- Scene sketch: token chip, vocabulary slots, selected slot, ID badge.
  Embedding vector is deliberately absent.
- Interaction: select `the` or `cat`.
- Transition: token aligns with a slot; selected slot receives a rim and ID.
- Mobile: token above, rack center, ID below.
- Fallback: existing vocabulary address SVG.
- Why 3D: slot depth separates address lookup from semantic distance.
- Secondary visual: `ID 크기 ≠ 의미 크기` micro note.
- Conclusion: Token ID는 vocabulary 안의 주소이며 의미 vector가
  아닙니다.

### 0.4 Tokenization 방식

- Learning question: 같은 text가 tokenizer 방식에 따라 어떻게
  달라지는가?
- Visual type: Hybrid.
- Primary renderer: R3F segmentation strip.
- Spatial grammar: RESEGMENTATION.
- Scene sketch: one source strip re-partitions for Word, Character, Subword,
  and Current Byte.
- Interaction: mode selector.
- Transition: boundaries dissolve and reform while source text persists.
- Mobile: wrapped source strip; one mode at a time.
- Fallback: exact existing comparison Figure.
- Why 3D: persistent text identity makes changed boundaries comparable.
- Secondary visual: compact DOM comparison table under the stage.
- Conclusion: Tokenization 방식은 같은 text의 경계와 sequence 길이를
  바꿉니다.

### 1.1 언어 모델이란?

- Learning question: 현재 context를 받으면 무엇을 내놓는가?
- Visual type: Scene.
- Primary renderer: R3F with DOM candidate labels.
- Spatial grammar: FAN-OUT.
- Scene sketch: context ribbon enters a structured computation core and
  branches into illustrative candidate tokens.
- Interaction: reveal Context, Model, Candidates.
- Transition: fixed context enters; candidate field fans out.
- Mobile: vertical context, core, candidates stack.
- Fallback: existing Language Model SVG.
- Why 3D: spatial branching separates one context from many candidates.
- Secondary visual: `model ≠ sampler` note.
- Conclusion: 언어 모델은 현재 context에서 vocabulary 후보 점수를
  만듭니다.

### 1.2 다음 Token 예측

- Learning question: Logit은 어떻게 probability와 선택으로 이어지는가?
- Visual type: Scene.
- Primary renderer: R3F candidate columns with DOM labels.
- Spatial grammar: TRANSFORMATION.
- Scene sketch: each candidate keeps one x-position through logit,
  probability, and selection.
- Interaction: Logit, Probability, Selection steps; optional temperature
  comparison.
- Transition: signed columns normalize into positive proportions; one
  candidate receives selected rim and lift.
- Mobile: one candidate stack per row; same identities remain visible.
- Fallback: current exact SVG Figure.
- Why 3D: height and layer transitions preserve candidate correspondence.
- Secondary visual: `logit ≠ probability` equation strip.
- Conclusion: 모델의 logits는 distribution으로 변환된 뒤 sampler가
  token을 선택합니다.

### 1.3 조건부 확률

- Learning question: 다음 token 확률은 앞선 context에 어떻게
  의존하는가?
- Visual type: Hybrid.
- Primary renderer: DOM/KaTeX chain with an R3F context-depth micro stage.
- Spatial grammar: ACCUMULATION.
- Scene sketch: `w1`, `w2`, `w3` remain on one precise 2D chain while context
  layers accumulate behind the active term.
- Interaction: select one chain term.
- Transition: context trail grows; formula remains static and exact.
- Mobile: vertical chain and fixed KaTeX formula.
- Fallback: existing conditional probability SVG/DOM.
- Why 3D: restrained depth shows accumulated context, not the formula.
- Secondary visual: canonical KaTeX product rule.
- Conclusion: 각 다음 token 분포는 이미 선택된 prefix를 조건으로
  계산됩니다.

### 1.4 Autoregressive Generation

- Learning question: 한 번의 prediction은 어떻게 긴 sequence가 되는가?
- Visual type: Scene.
- Primary renderer: R3F context loop with DOM token labels.
- Spatial grammar: GROWING LOOP.
- Scene sketch: context strip, model, selected token, append point, return
  lane.
- Interaction: Step, Replay, optional token example.
- Transition: candidate selects, token appends visibly, updated context returns
  to next-step input.
- Mobile: vertical loop with side return lane.
- Fallback: existing autoregressive SVG.
- Why 3D: separate forward and return lanes prevent the wrong loop target.
- Secondary visual: one-step prediction versus generation note.
- Conclusion: Autoregressive generation은 token 하나를 붙인 새 context로
  같은 예측을 반복합니다.

### 2.1 Token Embedding

- Learning question: Token ID는 어떻게 embedding row를 찾는가?
- Visual type: Scene redesign.
- Primary renderer: R3F table with DOM row labels.
- Spatial grammar: INDEXED EXTRACTION.
- Scene sketch: ID badge, dominant embedding table, nearby rows, selected row,
  extracted vector.
- Interaction: token selector and ID, Row, Vector step rail.
- Transition: selected row receives rim, lifts, separates, and aligns as a
  vector.
- Mobile: ID above, table center, vector below.
- Fallback: revised existing embedding SVG.
- Why 3D: extraction is a physical event rather than disconnected objects.
- Secondary visual: vocabulary addressing continuity from 0.3.
- Conclusion: Token ID는 embedding table의 한 row를 선택하고 그 row가
  vector가 됩니다.

### 2.2 Position Embedding

- Learning question: 같은 token은 위치 정보와 어떻게 합쳐지는가?
- Visual type: Scene redesign.
- Primary renderer: R3F parallel vector planes.
- Spatial grammar: LAYER MERGE.
- Scene sketch: token and position vectors occupy aligned z-planes; channel
  guides connect corresponding cells; merged `X_0` keeps `[C]`.
- Interaction: position 0/3 selector and Align, Add, Result steps.
- Transition: planes approach and channel pairs merge without length growth.
- Mobile: stacked planes with fixed channel correspondence.
- Fallback: revised existing addition SVG.
- Why 3D: z-separation shows two aligned sources becoming one vector.
- Secondary visual: `[C] + [C] = [C]`, `concatenation 아님`.
- Conclusion: Token vector와 position vector는 channel별로 더해져 같은
  길이의 `X_0`를 만듭니다.

### 2.3 Hidden State

- Learning question: shape가 같을 때 Block을 지나며 무엇이 달라지는가?
- Visual type: Scene redesign.
- Primary renderer: R3F fixed-frame tensor morph.
- Spatial grammar: STATE MORPHING.
- Scene sketch: three identically sized tensor frames share rows, columns,
  cell footprint, depth, and camera distance. Internal values change.
- Interaction: `X_0`, `X_1`, `X_N` step rail and compare mode.
- Transition: fill, inset, and cell value encoding morph inside fixed geometry.
- Mobile: one focused tensor plus persistent three-state shape ruler.
- Fallback: revised hidden-state SVG with identical geometry.
- Why 3D: stable outer frame plus changing inner depth encodes invariant and
  evolution together.
- Secondary visual: `SHAPE [T,C] = [T,C] = [T,C]`, `VALUES change`.
- Conclusion: Block을 지나도 tensor shape는 유지되고 각 위치의
  activation 값은 달라집니다.

### 3.1 GPT Architecture

- Learning question: 입력 context는 GPT 전체에서 어떤 경로를 지나 다음
  token이 되는가?
- Visual type: Flagship Scene.
- Primary renderer: R3F layered pipeline using current model metadata.
- Spatial grammar: PIPELINE.
- Scene sketch: Context, Embedding, Block stack, Final Norm, LM Head, Logits,
  Selection, Generated Token, Context Update. Embedding is explicitly token
  table lookup plus learned absolute position table lookup followed by
  shape-preserving element-wise addition into `X_0`.
- Interaction: select Input, Embedding, Blocks, Output, Generation.
- Transition: camera or stage focus travels through fixed geometry; no orbit.
- Mobile: vertical pipeline with return lane beside it.
- Fallback: current RootArchitecture SVG plus semantic ordered list.
- Why 3D: token/position composition, causal Block repetition, and context
  return occupy distinct depth lanes.
- Secondary visual: current `n_layer` and `n_head` metadata.
- Conclusion: GPT는 context를 Block stack으로 처리해 다음 token을
  선택하고 context에 다시 붙입니다.

### 4.1 Transformer Block

- Learning question: 하나의 Pre-LN Block 안에서 정보는 어떤 경로로
  흐르는가?
- Visual type: Flagship Scene.
- Primary renderer: R3F main path and residual lanes.
- Spatial grammar: RESIDUAL BRANCH AND MERGE.
- Scene sketch: `X_in`, LN1, Attention, Add, LN2, MLP, Add, `X_out`; two
  residual bypasses sit on a rear lane and merge at Add.
- Interaction: Attention half, MLP half, full flow.
- Transition: focus follows main computation while bypass remains visible.
- Mobile: vertical main path with one side residual lane.
- Fallback: existing TransformerBlockDetail SVG/DOM.
- Why 3D: depth distinguishes computation from bypass without crossing lines.
- Secondary visual: `Residual = bypass + merge`.
- Conclusion: Pre-LN Block은 정규화 뒤 하위 연산을 수행하고 residual
  stream에 두 번 더합니다.

### 5.1 Self-Attention

- Learning question: 각 token은 다른 token을 얼마나 참고하고 어떻게
  새로운 표현으로 합치는가?
- Visual type: Flagship Scene.
- Primary renderer: progressive R3F attention explorer.
- Spatial grammar: PROJECTION, MATRIX INTERACTION, NORMALIZATION,
  AGGREGATION.
- Scene sketch: Input; per-head Q/K/V projections; head-local
  `QK^T / sqrt(d_head)` scores; causal mask before Softmax; positive attention
  weights; head-local weighted V; head concatenation; output projection.
- Interaction: Overview, QKV, Scores, Mask, Softmax, Value. Layer/head
  selectors use metadata but values remain illustrative.
- Transition: project, interact, mask, normalize, aggregate.
- Mobile: one focused stage at a time with persistent miniature pipeline.
- Fallback: existing AttentionDetail SVG/DOM plus exact KaTeX equations.
- Why 3D: parallel Q/K/V layers, matrix plane, and weighted aggregation need
  distinct spatial relations.
- Secondary visual:
  `S = QK^T / sqrt(D)`, `A = softmax(mask(S))`, `Y = AV`.
- Conclusion: 각 head의 Q와 K가 attention weights를 만들고 그
  weights가 V를 합친 뒤, head 결과를 이어 output projection으로
  attention 출력을 만듭니다.

## Camera and stage registry

| Chapter | Camera | Stage height desktop | Mobile |
| --- | --- | ---: | ---: |
| 0.1 | shallow perspective across representation layers | 440px | 520px |
| 0.2 | front-facing strip | 340px | 430px |
| 0.3 | shallow rack perspective | 420px | 500px |
| 0.4 | front-facing wide strip | 360px | 460px |
| 1.1 | shallow fan-out perspective | 440px | 520px |
| 1.2 | front three-quarter candidate columns | 500px | 560px |
| 1.3 | near-orthographic context layers | 340px | 430px |
| 1.4 | shallow loop perspective | 480px | 560px |
| 2.1 | table-depth three-quarter view | 520px | 580px |
| 2.2 | channel-aligned side perspective | 480px | 560px |
| 2.3 | fixed tensor comparison view | 500px | 560px |
| 3.1 | layered pipeline perspective | 620px | 680px |
| 4.1 | main-lane and residual-depth perspective | 600px | 660px |
| 5.1 | staged matrix-depth perspective | 700px | 720px |

The registry owns aspect ratio and preferred width. CSS may use bounded stage
height tokens, but no viewport-specific fixed coordinates may define concept
geometry.

## Implementation and review gates

These are delivery stop gates, not learner locks. All Chapters remain directly
navigable, keyboard reachable, and available through semantic fallback. A
later implementation phase starts only after the previous phase passes its
production screenshot review.

### Foundation gate

- Scene stage hierarchy updated.
- shared primitives and semantic colors defined.
- scene-specific camera and stage metadata registered.
- Home still loads no Three/R3F chunk.

### Part 0 gate

- 0.1 visibly transforms representation;
- 0.2 visibly segments text;
- 0.3 visibly maps token to ID;
- 0.4 quickly compares tokenizer modes.

### Part 1 gate

- context and candidates remain related;
- logit, probability, and selection keep candidate identity;
- conditional chain remains mathematically exact;
- generated token visibly appends to updated context.

### Part 2 gate

- row extraction is unmistakable;
- position addition cannot read as concatenation;
- hidden geometry remains identical while values change;
- before/after evidence is materially better than baseline.

### GPT gate

Input, processing stack, prediction, selected token, and context update read in
one composition.

### Block gate

Residual bypass depth and exact Pre-LN order are immediately visible.

### Attention gate

After the scene, a beginner can describe:

1. Q/K/V separate;
2. Q and K form scores;
3. mask blocks future positions;
4. Softmax forms weights;
5. weights combine V.

### Final gate

- fourteen desktop final screenshots;
- seven representative mobile screenshots;
- required interaction states;
- baseline/final Part 2 comparisons;
- fourteen-Chapter contact sheet;
- all 32 approval questions YES;
- lifecycle, bundle, root/subpath, accessibility, Worker, Lab, and Score
  Matrix gates clean.

## Deferred

- new model or tokenizer;
- encoder-decoder or cross-attention;
- training;
- KV cache;
- actual runtime tensor mode for Learn;
- Worker protocol redesign;
- unrelated Lab scenes;
- shader-heavy post-processing;
- shared-Canvas portal architecture without measured need.
