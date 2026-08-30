import type { ReactElement } from "react";
import { HiddenStateSceneFigure } from "../../learning-scenes/hidden/HiddenStateSceneFigure";
import {
  NlpTransformationSceneFigure,
  TokenizationMethodsSceneFigure,
  TokenSegmentationSceneFigure,
  VocabularyAddressSceneFigure,
} from "../../learning-scenes/part0/Part0SceneFigures";
import { PositionEmbeddingSceneFigure } from "../../learning-scenes/position/PositionEmbeddingSceneFigure";
import { TokenEmbeddingSceneFigure } from "../../learning-scenes/token/TokenEmbeddingSceneFigure";
import type {
  LearningFigureMetadata,
  LearningFigureRegistry,
} from "../../learningFigureTypes";
import {
  type CURRICULUM_DIAGRAM_IDS,
  curriculumDiagramComponent,
  curriculumDiagramIds,
} from "./diagramRegistry";
import { isDiagramId } from "./types";

type CurriculumFigureId = (typeof CURRICULUM_DIAGRAM_IDS)[number];

const FIGURE_METADATA = {
  "decoder.diagram.intro.nlp": {
    fallbackFigureId: "decoder.diagram.intro.nlp.static",
    loadingStrategy: "visible",
    preferredAspectRatio: 2.05,
    preferredWidth: 960,
    reducedMotion: "static-final-state",
    renderer: "scene",
  },
  "decoder.diagram.tokenization.token": {
    fallbackFigureId: "decoder.diagram.tokenization.token.static",
    loadingStrategy: "visible",
    preferredAspectRatio: 2.4,
    preferredWidth: 960,
    reducedMotion: "static-final-state",
    renderer: "scene",
  },
  "decoder.diagram.tokenization.vocabulary": {
    fallbackFigureId: "decoder.diagram.tokenization.vocabulary.static",
    loadingStrategy: "visible",
    preferredAspectRatio: 1.9,
    preferredWidth: 920,
    reducedMotion: "static-final-state",
    renderer: "scene",
  },
  "decoder.diagram.tokenization.methods": {
    fallbackFigureId: "decoder.diagram.tokenization.methods.static",
    loadingStrategy: "visible",
    preferredAspectRatio: 2.55,
    preferredWidth: 980,
    reducedMotion: "static-final-state",
    renderer: "scene",
  },
  "decoder.diagram.language-model.definition": {
    preferredWidth: 760,
    renderer: "static",
  },
  "decoder.diagram.language-model.next-token": {
    preferredWidth: 720,
    renderer: "static",
  },
  "decoder.diagram.language-model.conditional-probability": {
    preferredWidth: 780,
    renderer: "static",
  },
  "decoder.diagram.language-model.autoregressive": {
    preferredWidth: 760,
    renderer: "static",
  },
  "decoder.diagram.representation.embedding": {
    fallbackFigureId: "decoder.diagram.representation.embedding.static",
    loadingStrategy: "visible",
    preferredAspectRatio: 1.55,
    preferredWidth: 960,
    reducedMotion: "static-final-state",
    renderer: "scene",
  },
  "decoder.diagram.representation.position": {
    fallbackFigureId: "decoder.diagram.representation.position.static",
    loadingStrategy: "visible",
    preferredAspectRatio: 1.55,
    preferredWidth: 960,
    reducedMotion: "static-final-state",
    renderer: "scene",
  },
  "decoder.diagram.representation.hidden-state": {
    fallbackFigureId: "decoder.diagram.representation.hidden-state.static",
    loadingStrategy: "visible",
    preferredAspectRatio: 1.6,
    preferredWidth: 1000,
    reducedMotion: "static-final-state",
    renderer: "scene",
  },
} as const satisfies Readonly<
  Record<CurriculumFigureId, LearningFigureMetadata>
>;

class CurriculumFigureRegistryError extends Error {
  constructor(readonly figureId: string) {
    super(`Curriculum Figure is not registered: ${figureId}`);
    this.name = "CurriculumFigureRegistryError";
  }
}

function renderFigure(figureId: string): ReactElement {
  if (!isDiagramId(figureId)) throw new CurriculumFigureRegistryError(figureId);
  if (figureId === "decoder.diagram.intro.nlp") {
    return <NlpTransformationSceneFigure />;
  }
  if (figureId === "decoder.diagram.tokenization.token") {
    return <TokenSegmentationSceneFigure />;
  }
  if (figureId === "decoder.diagram.tokenization.vocabulary") {
    return <VocabularyAddressSceneFigure />;
  }
  if (figureId === "decoder.diagram.tokenization.methods") {
    return <TokenizationMethodsSceneFigure />;
  }
  if (figureId === "decoder.diagram.representation.embedding") {
    return <TokenEmbeddingSceneFigure />;
  }
  if (figureId === "decoder.diagram.representation.position") {
    return <PositionEmbeddingSceneFigure />;
  }
  if (figureId === "decoder.diagram.representation.hidden-state") {
    return <HiddenStateSceneFigure />;
  }
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
  return FIGURE_METADATA[figureId].preferredWidth;
}

export const curriculumLearningFigures: LearningFigureRegistry = {
  figureIds: curriculumDiagramIds,
  metadata: (figureId) => {
    if (!isCurriculumFigureId(figureId)) {
      throw new CurriculumFigureRegistryError(figureId);
    }
    return FIGURE_METADATA[figureId];
  },
  preferredWidth,
  render: renderFigure,
};
