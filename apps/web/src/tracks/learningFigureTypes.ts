import type { ReactElement } from "react";

export type LearningFigureRegistry = Readonly<{
  figureIds: ReadonlySet<string>;
  render: (figureId: string) => ReactElement;
}>;
