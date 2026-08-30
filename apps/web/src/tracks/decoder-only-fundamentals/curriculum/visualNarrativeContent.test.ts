import type { GuideBlock, GuideVisualNarrativeBlock } from "../../guideTypes";
import { attentionGuide } from "../attentionGuide";
import { curriculumGuidePages } from "./guidePages";

type NarrativePage = Readonly<{
  introduction: readonly GuideBlock<string>[];
  keyTakeaway: readonly GuideBlock<string>[];
  sections: readonly Readonly<{
    blocks: readonly GuideBlock<string>[];
  }>[];
}>;

function narrativeBlocks(page: NarrativePage): GuideVisualNarrativeBlock[] {
  const blocks: GuideBlock<string>[] = [
    ...page.introduction,
    ...page.sections.flatMap(({ blocks: sectionBlocks }) => sectionBlocks),
    ...page.keyTakeaway,
  ];
  return blocks.filter(
    (block): block is GuideVisualNarrativeBlock =>
      block.kind === "visual-narrative",
  );
}

describe("Learn Visual Narrative benchmark scope", () => {
  test("uses exactly one canonical narrative in only three benchmark Guides", () => {
    const pages = [...curriculumGuidePages, attentionGuide];
    const narratives = pages.flatMap((page) =>
      narrativeBlocks(page).map((block) => ({
        figureId: block.figure.figureId,
        layout: block.layout,
        pageId: page.id,
      })),
    );

    expect(narratives).toEqual([
      {
        figureId: "decoder.diagram.tokenization.token",
        layout: "inline",
        pageId: "decoder.curriculum.guide.0.2",
      },
      {
        figureId: "decoder.diagram.representation.embedding",
        layout: "split",
        pageId: "decoder.curriculum.guide.2.1",
      },
      {
        figureId: "self-attention",
        layout: "sticky",
        pageId: "decoder-guide-self-attention",
      },
    ]);
  });

  test("maps simple medium and flagship stages to readable prose beats", () => {
    const pages = [...curriculumGuidePages, attentionGuide];
    const narratives = pages.flatMap(narrativeBlocks);

    expect(
      narratives.map(({ beats }) => beats.map(({ stage }) => stage)),
    ).toEqual([
      ["source", "boundaries", "split"],
      ["id", "lookup", "lift", "vector"],
      ["overview", "qkv", "scores", "mask", "softmax", "value"],
    ]);
    for (const narrative of narratives) {
      expect(narrative.beats.every(({ text }) => text.length > 30)).toBe(true);
      expect(narrative.figure.caption.length).toBeGreaterThan(20);
    }
  });
});
