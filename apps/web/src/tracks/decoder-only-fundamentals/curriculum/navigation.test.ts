import { describe, expect, test } from "vitest";

import { CHAPTER_IDS } from "./ids";
import { chapterNavigation, curriculumChapters } from "./navigation";

describe("curriculum chapter navigation", () => {
  test("derives one ordered spine and named neighbors when a middle chapter is current", () => {
    // Given: the fixed validated curriculum order.
    // When: a middle chapter is selected.
    const navigation = chapterNavigation(CHAPTER_IDS[6]);

    // Then: all chapters are present and neighbors come from order.
    expect(curriculumChapters.map(({ id }) => id)).toEqual(CHAPTER_IDS);
    expect(navigation).toMatchObject({
      index: 6,
      previous: { id: CHAPTER_IDS[5], title: "다음 Token 예측" },
      next: { id: CHAPTER_IDS[7], title: "Autoregressive Generation" },
    });
  });

  test("omits navigation controls at the curriculum boundaries", () => {
    // Given: the first and final Chapter IDs.
    // When: their navigation values are derived.
    const first = chapterNavigation(CHAPTER_IDS[0]);
    const last = chapterNavigation(CHAPTER_IDS[13]);

    // Then: no disabled placeholder destination is manufactured.
    expect(first).not.toHaveProperty("previous");
    expect(first).toHaveProperty("next.id", CHAPTER_IDS[1]);
    expect(last).toHaveProperty("previous.id", CHAPTER_IDS[12]);
    expect(last).not.toHaveProperty("next");
  });

  test("returns no navigation for a malformed destination", () => {
    // Given: an ID outside the catalog.
    // When: navigation is requested.
    const navigation = chapterNavigation("decoder.chapter.malformed");

    // Then: the invalid destination fails closed.
    expect(navigation).toBeUndefined();
  });
});
