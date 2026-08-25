import type { ComponentType } from "react";

import type { CurriculumDiagramRendererProps } from "./DecoderTrackWorkspace";
import { NlpPipelineDiagram } from "./diagrams/part0/NlpPipelineDiagram";
import { TokenComparisonDiagram } from "./diagrams/part0/TokenComparisonDiagram";
import { TokenizationMethodsDiagram } from "./diagrams/part0/TokenizationMethodsDiagram";
import { VocabularyAddressDiagram } from "./diagrams/part0/VocabularyAddressDiagram";
import { AutoregressiveLoopDiagram } from "./diagrams/part1/AutoregressiveLoopDiagram";
import { ConditionalProbabilityDiagram } from "./diagrams/part1/ConditionalProbabilityDiagram";
import { LanguageModelDiagram } from "./diagrams/part1/LanguageModelDiagram";
import { NextTokenPredictionDiagram } from "./diagrams/part1/NextTokenPredictionDiagram";
import { HiddenStateDiagram } from "./diagrams/part2/HiddenStateDiagram";
import { PositionEmbeddingDiagram } from "./diagrams/part2/PositionEmbeddingDiagram";
import { TokenEmbeddingDiagram } from "./diagrams/part2/TokenEmbeddingDiagram";
import type {
  CurriculumConceptCandidate,
  CurriculumIssue,
  CurriculumRegistries,
  DiagramId,
} from "./types";

export const CURRICULUM_DIAGRAM_IDS = [
  "decoder.diagram.intro.nlp",
  "decoder.diagram.tokenization.token",
  "decoder.diagram.tokenization.vocabulary",
  "decoder.diagram.tokenization.methods",
  "decoder.diagram.language-model.definition",
  "decoder.diagram.language-model.next-token",
  "decoder.diagram.language-model.conditional-probability",
  "decoder.diagram.language-model.autoregressive",
  "decoder.diagram.representation.embedding",
  "decoder.diagram.representation.position",
  "decoder.diagram.representation.hidden-state",
] as const;

export const curriculumDiagramIds: ReadonlySet<string> = new Set(
  CURRICULUM_DIAGRAM_IDS,
);
export const curriculumVisualizationIds: ReadonlySet<string> = new Set();

const curriculumDiagramComponents: Readonly<
  Record<string, ComponentType<CurriculumDiagramRendererProps>>
> = {
  "decoder.diagram.intro.nlp": NlpPipelineDiagram,
  "decoder.diagram.tokenization.token": TokenComparisonDiagram,
  "decoder.diagram.tokenization.vocabulary": VocabularyAddressDiagram,
  "decoder.diagram.tokenization.methods": TokenizationMethodsDiagram,
  "decoder.diagram.language-model.definition": LanguageModelDiagram,
  "decoder.diagram.language-model.next-token": NextTokenPredictionDiagram,
  "decoder.diagram.language-model.conditional-probability":
    ConditionalProbabilityDiagram,
  "decoder.diagram.language-model.autoregressive": AutoregressiveLoopDiagram,
  "decoder.diagram.representation.embedding": TokenEmbeddingDiagram,
  "decoder.diagram.representation.position": PositionEmbeddingDiagram,
  "decoder.diagram.representation.hidden-state": HiddenStateDiagram,
};

export function curriculumDiagramComponent(
  diagramId: DiagramId,
): ComponentType<CurriculumDiagramRendererProps> | undefined {
  return curriculumDiagramComponents[diagramId];
}

export function conceptRegistryIssues(
  concept: CurriculumConceptCandidate,
  path: string,
  registries: CurriculumRegistries,
): readonly CurriculumIssue[] {
  const issues: CurriculumIssue[] = [];
  if (concept.diagramId.trim() === "") {
    issues.push({ code: "missing-diagram", path: `${path}.diagramId` });
  } else if (!registries.diagramIds.has(concept.diagramId)) {
    issues.push({
      code: "unknown-diagram",
      path: `${path}.diagramId`,
      relatedId: concept.diagramId,
    });
  }
  concept.relatedNodeIds.forEach((id, index) => {
    if (!registries.nodeIds.has(id)) {
      issues.push({
        code: "unknown-related-node",
        path: `${path}.relatedNodeIds[${index}]`,
        relatedId: id,
      });
    }
  });
  concept.referenceIds.forEach((id, index) => {
    if (!registries.references.some((reference) => reference.id === id)) {
      issues.push({
        code: "unknown-reference",
        path: `${path}.referenceIds[${index}]`,
        relatedId: id,
      });
    }
  });
  if (
    concept.visualizationId !== undefined &&
    !registries.visualizationIds.has(concept.visualizationId)
  ) {
    issues.push({
      code: "unknown-visualization",
      path: `${path}.visualizationId`,
      relatedId: concept.visualizationId,
    });
  }
  if (
    concept.visualizationId === undefined &&
    concept.visualizationCtaCount !== 0
  ) {
    issues.push({
      code: "visualization-cta-without-visualization",
      path: `${path}.visualizationCtaCount`,
    });
  }
  return issues;
}
