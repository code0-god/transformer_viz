import type { ReactElement } from "react";

export type StaticLearningFigureMetadata = Readonly<{
  preferredWidth: number;
  renderer: "static";
}>;

export type SceneLearningFigureMetadata = Readonly<{
  fallbackFigureId: string;
  loadingStrategy: "visible";
  preferredAspectRatio: number;
  preferredWidth: number;
  reducedMotion: "static-final-state";
  renderer: "scene";
}>;

export type LearningFigureMetadata =
  | StaticLearningFigureMetadata
  | SceneLearningFigureMetadata;

export type LearningFigureRegistry = Readonly<{
  figureIds: ReadonlySet<string>;
  metadata: (figureId: string) => LearningFigureMetadata;
  preferredWidth: (figureId: string) => number;
  render: (figureId: string) => ReactElement;
}>;
