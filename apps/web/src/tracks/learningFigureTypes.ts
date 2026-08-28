import type { ReactElement } from "react";

export type LearningFigureRegistry = Readonly<{
  figureIds: ReadonlySet<string>;
  preferredWidth: (figureId: string) => number;
  render: (figureId: string) => ReactElement;
}>;
