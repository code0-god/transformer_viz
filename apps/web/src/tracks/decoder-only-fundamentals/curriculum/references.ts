import type { CurriculumIssue, LearningReference } from "./types";

const ACCESS_DATE = "2026-08-25";
const ORIGINALITY_EXCLUSION =
  "No prose, examples, ordering, tables, code, images, or visual composition reused";

export type CurriculumAuthorshipProvenance = {
  readonly kind: "independently-composed";
  readonly sourceBoundary: "plan-and-runtime-facts-only";
  readonly humanSideBySide: "pending";
  readonly rightsClearance: "not-claimed";
};

export const curriculumAuthorshipProvenance = {
  kind: "independently-composed",
  sourceBoundary: "plan-and-runtime-facts-only",
  humanSideBySide: "pending",
  rightsClearance: "not-claimed",
} as const satisfies CurriculumAuthorshipProvenance;

const EXPECTED_REFERENCE_ROLES: Readonly<Record<string, string>> = {
  "ref.tistory.21": "pedagogical-reference",
  "ref.tistory.22": "pedagogical-reference",
  "ref.tistory.23": "pedagogical-reference",
  "ref.tistory.24": "pedagogical-reference",
  "ref.repo.tokenizer": "implementation-source",
  "ref.repo.model": "implementation-source",
  "ref.repo.layers": "implementation-source",
  "ref.repo.generation": "implementation-source",
  "ref.repo.schema": "implementation-source",
  "ref.rfc3629": "primary-technical-source",
  "ref.transformer-paper": "primary-technical-source",
  "ref.nanogpt-pinned": "primary-technical-source",
};

export const curriculumReferences = [
  {
    id: "ref.tistory.21",
    role: "pedagogical-reference",
    source: "https://122gu.tistory.com/21",
    topicUsed: "Language-model teaching scope",
    currentModelCorrection: "Runtime facts remain authoritative",
    exclusion: ORIGINALITY_EXCLUSION,
    accessDate: ACCESS_DATE,
  },
  {
    id: "ref.tistory.22",
    role: "pedagogical-reference",
    source: "https://122gu.tistory.com/22",
    topicUsed: "Tokenization teaching scope",
    currentModelCorrection: "Current tokenizer is UTF-8 byte fallback, not BPE",
    exclusion: ORIGINALITY_EXCLUSION,
    accessDate: ACCESS_DATE,
  },
  {
    id: "ref.tistory.23",
    role: "pedagogical-reference",
    source: "https://122gu.tistory.com/23",
    topicUsed: "Embedding teaching scope",
    currentModelCorrection: "Current dimensions come from typed runtime facts",
    exclusion: ORIGINALITY_EXCLUSION,
    accessDate: ACCESS_DATE,
  },
  {
    id: "ref.tistory.24",
    role: "pedagogical-reference",
    source: "https://122gu.tistory.com/24",
    topicUsed: "Hidden-state teaching scope",
    currentModelCorrection: "Current model is Pre-LN decoder-only",
    exclusion: ORIGINALITY_EXCLUSION,
    accessDate: ACCESS_DATE,
  },
  {
    id: "ref.repo.tokenizer",
    role: "implementation-source",
    source: "crates/nanogpt-tokenizer/src/lib.rs",
    topicUsed: "Tokenizer encoding and decoding",
    currentModelCorrection: "Canonical public tokenizer asset configures IDs",
    exclusion: "No browser-side tokenization",
    accessDate: ACCESS_DATE,
  },
  {
    id: "ref.repo.model",
    role: "implementation-source",
    source: "crates/nanogpt-model/src/model.rs",
    topicUsed: "Decoder model flow",
    currentModelCorrection: "Pinned repository behavior only",
    exclusion: "No unsupported architecture claims",
    accessDate: ACCESS_DATE,
  },
  {
    id: "ref.repo.layers",
    role: "implementation-source",
    source: "crates/nanogpt-model/src/layers.rs",
    topicUsed: "Transformer layer boundaries",
    currentModelCorrection: "Pre-LN and causal behavior are source-bound",
    exclusion: "No inferred tensor values",
    accessDate: ACCESS_DATE,
  },
  {
    id: "ref.repo.generation",
    role: "implementation-source",
    source: "crates/transformer-viz-worker/src/generation.rs",
    topicUsed: "Generation lifecycle",
    currentModelCorrection: "No persistent generation KV cache",
    exclusion: "No Worker mutation from curriculum",
    accessDate: ACCESS_DATE,
  },
  {
    id: "ref.repo.schema",
    role: "implementation-source",
    source: "crates/nanogpt-schema/src/lib.rs",
    topicUsed: "Typed runtime schema",
    currentModelCorrection: "No schema or wire extension in curriculum",
    exclusion: "No synthetic runtime facts",
    accessDate: ACCESS_DATE,
  },
  {
    id: "ref.rfc3629",
    role: "primary-technical-source",
    source: "https://www.rfc-editor.org/rfc/rfc3629",
    topicUsed: "UTF-8 byte semantics",
    currentModelCorrection: "Korean 한 occupies three UTF-8 bytes",
    exclusion: "No normative text reproduced",
    accessDate: ACCESS_DATE,
  },
  {
    id: "ref.transformer-paper",
    role: "primary-technical-source",
    source: "https://arxiv.org/abs/1706.03762",
    topicUsed: "Transformer technical lineage",
    currentModelCorrection: "Current model-specific differences are explicit",
    exclusion: "No figures or prose reproduced",
    accessDate: ACCESS_DATE,
  },
  {
    id: "ref.nanogpt-pinned",
    role: "primary-technical-source",
    source: "reference/nanoGPT@3adf61e154c3fe3fca428ad6bc3818b27a3b8291",
    topicUsed: "Pinned nanoGPT lineage",
    currentModelCorrection: "Claims are limited to the pinned source",
    exclusion: "No source code displayed to learners",
    accessDate: ACCESS_DATE,
  },
] as const satisfies readonly LearningReference[];

export function referenceRoleIssues(
  references: readonly LearningReference[],
): readonly CurriculumIssue[] {
  const issues: CurriculumIssue[] = [];
  references.forEach((reference, index) => {
    const expected = EXPECTED_REFERENCE_ROLES[reference.id];
    if (expected !== undefined && reference.role !== expected) {
      issues.push({
        code: "wrong-reference-role",
        path: `references[${index}].role`,
        relatedId: reference.id,
      });
    }
  });
  return issues;
}
