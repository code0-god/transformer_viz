import { describe, expect, test } from "vitest";
import { curriculumReferences } from "./references";

const expectedRoles = {
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
} as const;

describe("curriculum references", () => {
  test("defines the exact reference role for every fixed source", () => {
    const actual = Object.fromEntries(
      curriculumReferences.map(({ id, role }) => [id, role]),
    );
    expect(actual).toEqual(expectedRoles);
  });

  test("keeps all required provenance fields nonempty", () => {
    expect(curriculumReferences).toHaveLength(12);
    for (const reference of curriculumReferences) {
      expect(
        Object.values(reference).every((value) => value.trim().length > 0),
      ).toBe(true);
    }
  });
});
