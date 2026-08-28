import type { ReactElement } from "react";

import type { GuideBlock } from "./guideTypes";
import type { LearningFigureRegistry } from "./learningFigureTypes";

type FigureBlock = Extract<GuideBlock<string>, { kind: "figure" }>;

class LearningFigureRegistryError extends Error {
  constructor(readonly figureId: string) {
    super(`Learning Figure is not registered: ${figureId}`);
    this.name = "LearningFigureRegistryError";
  }
}

export function LearningFigure({
  block,
  registry,
}: Readonly<{
  block: FigureBlock;
  registry: LearningFigureRegistry | undefined;
}>): ReactElement {
  if (registry === undefined || !registry.figureIds.has(block.figureId)) {
    throw new LearningFigureRegistryError(block.figureId);
  }

  return (
    <figure
      className="learning-figure"
      data-figure-id={block.figureId}
      data-figure-size={block.size ?? "prose"}
      aria-label={block.alt}
    >
      <div className="learning-figure__content">
        {registry.render(block.figureId)}
      </div>
      <figcaption>{block.caption}</figcaption>
    </figure>
  );
}
