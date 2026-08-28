import { render } from "@testing-library/react";
import { decoderOnlyFundamentalsProfile } from "./decoder-only-fundamentals";
import { LearningGuide } from "./LearningGuide";
import type { LearningFigureRegistry } from "./learningFigureTypes";
import { validateLearningProfile } from "./validation";

const figures: LearningFigureRegistry = {
  figureIds: new Set(["root"]),
  render: () => (
    <svg role="img" aria-label="Registered Figure" viewBox="0 0 1 1">
      <title>Registered Figure</title>
    </svg>
  ),
};

describe("learning guide profile", () => {
  test("has complete routes, nodes, formulas, and glossary mappings", () => {
    expect(validateLearningProfile(decoderOnlyFundamentalsProfile)).toEqual([]);
  });

  test("renders every current guide page", () => {
    const pages = Object.values(
      decoderOnlyFundamentalsProfile.guide.pages,
    ).flatMap((page) => (page === undefined ? [] : [page]));
    const { container } = render(
      pages.map((page) => (
        <LearningGuide
          key={page.id}
          page={page}
          glossary={decoderOnlyFundamentalsProfile.guide.glossary}
          formulas={decoderOnlyFundamentalsProfile.notation.formulas}
          figures={figures}
        />
      )),
    );

    expect(container.querySelectorAll("[data-guide-page-id]")).toHaveLength(
      pages.length,
    );
  });
});
