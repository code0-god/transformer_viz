import type { CSSProperties, ReactElement } from "react";

import type { GuideBlock } from "./guideTypes";
import type { LearningFigureRegistry } from "./learningFigureTypes";

type FigureBlock = Extract<GuideBlock<string>, { kind: "figure" }>;
type LearningFigureStyle = CSSProperties & {
  readonly "--learning-figure-preferred-width": string;
};

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
  const preferredWidth = registry.preferredWidth(block.figureId);
  const graphicStyle: LearningFigureStyle = {
    "--learning-figure-preferred-width": `${preferredWidth}px`,
  };

  return (
    <figure
      className="learning-figure"
      data-figure-id={block.figureId}
      data-figure-preferred-width={preferredWidth}
      data-figure-size={block.size ?? "prose"}
      data-threeui-surface="figure"
      aria-label={block.alt}
    >
      <div
        className="learning-figure__content learning-figure__graphic"
        style={graphicStyle}
      >
        {registry.render(block.figureId)}
      </div>
      <figcaption>{block.caption}</figcaption>
    </figure>
  );
}
