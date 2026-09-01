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
  test("uses one Golden narrative plus three benchmark narratives", () => {
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
        figureId: "decoder.diagram.intro.nlp",
        layout: "golden",
        pageId: "decoder.curriculum.guide.0.1",
      },
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
      ["language", "numeric", "transform", "result", "token-preview"],
      ["source", "boundaries", "split"],
      ["id", "lookup", "lift", "vector"],
      ["overview", "qkv", "scores", "mask", "softmax", "value"],
    ]);
    for (const narrative of narratives) {
      expect(new Set(narrative.beats.map(({ id }) => id)).size).toBe(
        narrative.beats.length,
      );
      expect(narrative.figure.kind).toBe("figure");
    }
  });
});
