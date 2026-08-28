import type { ReactElement } from "react";

import type { LearningFigureRegistry } from "../../learningFigureTypes";
import {
  curriculumDiagramComponent,
  curriculumDiagramIds,
} from "./diagramRegistry";
import { isDiagramId } from "./types";

class CurriculumFigureRegistryError extends Error {
  constructor(readonly figureId: string) {
    super(`Curriculum Figure is not registered: ${figureId}`);
    this.name = "CurriculumFigureRegistryError";
  }
}

function renderFigure(figureId: string): ReactElement {
  if (!isDiagramId(figureId)) throw new CurriculumFigureRegistryError(figureId);
  const Figure = curriculumDiagramComponent(figureId);
  if (Figure === undefined) throw new CurriculumFigureRegistryError(figureId);
  return <Figure />;
}

export const curriculumLearningFigures: LearningFigureRegistry = {
  figureIds: curriculumDiagramIds,
  render: renderFigure,
};
