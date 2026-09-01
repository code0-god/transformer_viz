import type { ReactElement } from "react";

import type { LearningFigureRegistry } from "../../learningFigureTypes";
import {
  type CURRICULUM_DIAGRAM_IDS,
  curriculumDiagramComponent,
  curriculumDiagramIds,
} from "./diagramRegistry";
import { isDiagramId } from "./types";

type CurriculumFigureId = (typeof CURRICULUM_DIAGRAM_IDS)[number];

const PREFERRED_WIDTHS = {
  "decoder.diagram.intro.nlp": 720,
  "decoder.diagram.tokenization.token": 800,
  "decoder.diagram.tokenization.vocabulary": 760,
  "decoder.diagram.tokenization.methods": 840,
  "decoder.diagram.language-model.definition": 760,
  "decoder.diagram.language-model.next-token": 600,
  "decoder.diagram.language-model.conditional-probability": 780,
  "decoder.diagram.language-model.autoregressive": 760,
  "decoder.diagram.representation.embedding": 760,
  "decoder.diagram.representation.position": 760,
  "decoder.diagram.representation.hidden-state": 760,
} satisfies Readonly<Record<CurriculumFigureId, number>>;

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

function isCurriculumFigureId(
  figureId: string,
): figureId is CurriculumFigureId {
  return curriculumDiagramIds.has(figureId);
}

function preferredWidth(figureId: string): number {
  if (!isCurriculumFigureId(figureId)) {
    throw new CurriculumFigureRegistryError(figureId);
  }
  return PREFERRED_WIDTHS[figureId];
}

export const curriculumLearningFigures: LearningFigureRegistry = {
  figureIds: curriculumDiagramIds,
  preferredWidth,
  render: renderFigure,
};
