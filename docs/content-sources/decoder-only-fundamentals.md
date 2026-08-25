# Decoder-only Fundamentals: Content Source and Execution Contract

This Phase 1 record fixes provenance, curriculum locks, and worktree protection before implementation. It is a planning record, not a claim that the proposed curriculum exists in the product.

## Source records

### Source 1
- URL: https://122gu.tistory.com/21
- role: pedagogical-reference
- topic used: Broad NLP framing; training, pretraining, and inference distinctions.
- current-model correction: The current browser product performs inference and trace inspection, not training; model outputs are logits before probability and selection stages.
- exclusion: No source prose, task lists, examples, figures, images, captions, or narrative ordering may ship.
- access date: 2026-08-25
- originality declaration: Independently written material only; final originality review pending.

### Source 2
- URL: https://122gu.tistory.com/22
- role: pedagogical-reference
- topic used: Qualitative tokenization-family comparison and vocabulary-versus-sequence trade-offs.
- current-model correction: The current tokenizer is deterministic UTF-8 byte fallback, not BPE, WordPiece, GPT-2, or word-level tokenization.
- exclusion: No merge tables, source examples, diagrams, WordPiece walkthroughs, assets, or source sequencing may ship.
- access date: 2026-08-25
- originality declaration: Independently written material only; final originality review pending.

### Source 3
- URL: https://122gu.tistory.com/23
- role: pedagogical-reference
- topic used: Language-model conditionals and the distinction between model scoring and token selection.
- current-model correction: The current model is decoder-only, uses the final context position for generation, and forwards the accumulated prefix without a persistent generation KV cache.
- exclusion: No attention matrices, token sequences, equation layouts, encoder-decoder figures, examples, or source prose may ship.
- access date: 2026-08-25
- originality declaration: Independently written material only; final originality review pending.

### Source 4
- URL: https://122gu.tistory.com/24
- role: pedagogical-reference
- topic used: High-level block-operation framing and bounded architecture-family comparison.
- current-model correction: The current MLP uses GELU rather than ReLU; the model uses Pre-LN blocks with learned token and position embeddings.
- exclusion: No equations, comparison tables, images, examples, architecture artwork, or source ordering may ship.
- access date: 2026-08-25
- originality declaration: Independently written material only; final originality review pending.

## Provenance boundary

The named book `Do It! BERT와 GPT로 배우는 자연어 처리` is recorded as `indirect/not-consulted lineage`. Rights are `rights unknown/no permissive license found`; this is bounded negative evidence, not a legal conclusion, and no clearance claim is made. The four pages are pedagogical-reference inputs only. Final material must not copy or adapt source prose, examples, sequence, tables, code, screenshots, images, diagrams, SVG composition, layout, palette, or numbers.

Downstream Chapter references must use exactly these roles: `pedagogical-reference`, `implementation-source`, and `primary-technical-source`. Exact-overlap and asset scans are triage only. A final human side-by-side originality review remains pending.

## Baseline and protected dirty worktree

- HEAD SHA: `67a95eef67c0e21f6fb1605e22d711e48f93ed51`
- Tree SHA: `4b72e17515a6c4b76af36cc7e76a04e3b530a879`
- Upstream: unavailable for `main`; configured origin is `https://github.com/code0-god/transformer_viz.git`.
- Pinned toolchain: Node `22.22.0` through the Docker toolchain; pinned nanoGPT `3adf61e154c3fe3fca428ad6bc3818b27a3b8291`; Docker Compose `v5.1.0`.
- Protected binary patch: `.omo/evidence/curriculum/phase-01/protected-dirty-before/protected-dirty.patch`
- Protected binary patch SHA-256: `4bba49ea8318d1c8535f6d011d2236430bcb538d08e51feaf5330010bf16bb55`
- Protected file hashes: `.omo/evidence/curriculum/phase-01/protected-dirty-before/sha256.txt`

The following twelve pre-existing modified paths are protected. They must not be edited, staged, restored, stashed, overwritten, or formatted by this Phase:

1. `apps/web/src/LearningWorkspace.integration.test.tsx`
2. `apps/web/src/architecture/attention/AttentionDiagram.tsx`
3. `apps/web/src/architecture/attention/attention.css`
4. `apps/web/src/architecture/block/BlockDiagram.tsx`
5. `apps/web/src/architecture/block/block.css`
6. `apps/web/src/architecture/root/RootArchitecture.tsx`
7. `apps/web/src/architecture/root/rootArchitecture.css`
8. `apps/web/src/tracks/LearningGuide.test.tsx`
9. `apps/web/src/tracks/LearningWorkspace.test.tsx`
10. `apps/web/src/tracks/decoder-only-fundamentals/DecoderLearningWorkspace.tsx`
11. `apps/web/src/tracks/learningGuide.css`
12. `apps/web/src/tracks/learningWorkspace.css`

## 11-Chapter checklist

This is an implementation lock for independently authored Chapter material. It records the fixed identifiers, titles, takeaways, references, and derived next targets; it does not reproduce source prose, examples, sequence, assets, or visual treatment. Every Chapter requires a goal, definition before notation, six or more substantive original paragraphs, a current-model callout, at least two misconceptions, at least three glossary terms, its primary Diagram, and the three reference roles.

- [ ] `decoder.chapter.0.1` — `0.1 자연어 처리란?`; concept `decoder.intro.nlp`; Guide `decoder.curriculum.guide.0.1`; Diagram `decoder.diagram.intro.nlp`; takeaway: `자연어 처리 모델은 텍스트를 숫자 표현으로 바꾸어 계산하고, 그 결과를 사람이 사용하는 형태로 해석합니다.`; next `decoder.chapter.0.2` / `Token이란?`.
- [ ] `decoder.chapter.0.2` — `0.2 Token이란?`; concept `decoder.tokenization.token`; Guide `decoder.curriculum.guide.0.2`; Diagram `decoder.diagram.tokenization.token`; takeaway: `Token은 모델이 한 번에 처리하는 텍스트 단위이며, 단어보다 작거나 여러 글자를 포함할 수 있습니다.`; next `decoder.chapter.0.3` / `Vocabulary와 Token ID`.
- [ ] `decoder.chapter.0.3` — `0.3 Vocabulary와 Token ID`; concept `decoder.tokenization.vocabulary`; Guide `decoder.curriculum.guide.0.3`; Diagram `decoder.diagram.tokenization.vocabulary`; takeaway: `Token ID는 vocabulary에서 token을 찾기 위한 주소이며, 실제 의미 계산은 embedding vector에서 시작됩니다.`; next `decoder.chapter.0.4` / `Tokenization 방식`.
- [ ] `decoder.chapter.0.4` — `0.4 Tokenization 방식`; concept `decoder.tokenization.methods`; Guide `decoder.curriculum.guide.0.4`; Diagram `decoder.diagram.tokenization.methods`; takeaway: `Tokenization 방식은 vocabulary 크기와 sequence 길이 사이의 균형을 결정합니다.`; next `decoder.chapter.1.1` / `언어 모델이란?`.
- [ ] `decoder.chapter.1.1` — `1.1 언어 모델이란?`; concept `decoder.language-model.definition`; Guide `decoder.curriculum.guide.1.1`; Diagram `decoder.diagram.language-model.definition`; takeaway: `Decoder-only 언어 모델은 이전 토큰들이 주어졌을 때 다음 토큰 후보들의 점수를 계산합니다.`; next `decoder.chapter.1.2` / `다음 Token 예측`.
- [ ] `decoder.chapter.1.2` — `1.2 다음 Token 예측`; concept `decoder.language-model.next-token`; Guide `decoder.curriculum.guide.1.2`; Diagram `decoder.diagram.language-model.next-token`; takeaway: `다음 token 예측은 현재 문맥을 이용해 vocabulary 전체의 점수를 만든 뒤 한 token을 선택하는 과정입니다.`; next `decoder.chapter.1.3` / `조건부 확률`.
- [ ] `decoder.chapter.1.3` — `1.3 조건부 확률`; concept `decoder.language-model.conditional-probability`; Guide `decoder.curriculum.guide.1.3`; Diagram `decoder.diagram.language-model.conditional-probability`; takeaway: `전체 sequence의 확률은 이전 토큰들이 주어졌을 때 다음 토큰이 나타날 확률들을 이어 곱한 것으로 볼 수 있습니다.`; next `decoder.chapter.1.4` / `Autoregressive Generation`.
- [ ] `decoder.chapter.1.4` — `1.4 Autoregressive Generation`; concept `decoder.language-model.autoregressive`; Guide `decoder.curriculum.guide.1.4`; Diagram `decoder.diagram.language-model.autoregressive`; takeaway: `Autoregressive generation은 “다음 token 예측 → context에 추가 → 다시 예측”을 반복합니다.`; next `decoder.chapter.2.1` / `Token Embedding`.
- [ ] `decoder.chapter.2.1` — `2.1 Token Embedding`; concept `decoder.representation.embedding`; Guide `decoder.curriculum.guide.2.1`; Diagram `decoder.diagram.representation.embedding`; takeaway: `Token Embedding은 token ID를 모델이 계산할 수 있는 연속적인 숫자 vector로 바꿉니다.`; next `decoder.chapter.2.2` / `Position Embedding`.
- [ ] `decoder.chapter.2.2` — `2.2 Position Embedding`; concept `decoder.representation.position`; Guide `decoder.curriculum.guide.2.2`; Diagram `decoder.diagram.representation.position`; takeaway: `Position Embedding은 각 token이 sequence의 어느 위치에 있는지 나타내는 vector이며, Token Embedding에 더해집니다.`; next `decoder.chapter.2.3` / `Hidden State`.
- [ ] `decoder.chapter.2.3` — `2.3 Hidden State`; concept `decoder.representation.hidden-state`; Guide `decoder.curriculum.guide.2.3`; Diagram `decoder.diagram.representation.hidden-state`; takeaway: `Hidden State는 각 token의 현재 내부 표현이며, Transformer Block이 새로운 문맥 정보를 반영할 때마다 갱신됩니다.`; next `decoder.chapter.3.1` / `GPT`.

## Phase 1 exclusions

This Phase creates no product UI, schema, Worker request or response change, tokenizer implementation, browser-side token calculation, visualization control, source asset, source-derived illustration, or rights clearance. Proposed curriculum interfaces remain future work until later phases validate them.
