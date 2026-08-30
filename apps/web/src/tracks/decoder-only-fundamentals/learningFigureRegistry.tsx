import type { ReactElement } from "react";

import { RootArchitecture } from "../../architecture/root/RootArchitecture";
import { GptArchitectureSceneFigure } from "../learning-scenes/gpt/GptArchitectureSceneFigure";
import type { LearningFigureRegistry } from "../learningFigureTypes";
import type { ArchitectureRenderContext } from "../types";

const ROOT_FIGURE_IDS: ReadonlySet<string> = new Set(["root"]);
const ROOT_LEARNING_STAGES = [
  "Input Context",
  "Token + Position Embedding",
  "Transformer Block × N",
  "Final LayerNorm",
  "LM Head",
  "Logits",
  "Token Selection",
  "Generated Token",
  "Context Update ↺",
] as const;

class DecoderLearningFigureError extends Error {
  constructor(readonly figureId: string) {
    super(`Decoder learning Figure is not registered: ${figureId}`);
    this.name = "DecoderLearningFigureError";
  }
}

export function createDecoderLearningFigureRegistry(
  context: ArchitectureRenderContext,
): LearningFigureRegistry {
  return {
    figureIds: ROOT_FIGURE_IDS,
    metadata: (figureId) => {
      if (figureId !== "root") throw new DecoderLearningFigureError(figureId);
      return {
        fallbackFigureId: "root.static",
        loadingStrategy: "visible",
        preferredAspectRatio: 1.62,
        preferredWidth: 1000,
        reducedMotion: "static-final-state",
        renderer: "scene",
      };
    },
    preferredWidth: (figureId): number => {
      if (figureId !== "root") throw new DecoderLearningFigureError(figureId);
      return 1000;
    },
    render: (figureId): ReactElement => {
      if (figureId !== "root") throw new DecoderLearningFigureError(figureId);
      const fallback = (
        <div className="decoder-learning-architecture">
          <RootArchitecture
            presentation="learn"
            modelName={context.model.name}
            config={context.model.config}
            state={context.state}
          />
          <ol
            className="decoder-learning-architecture__mobile"
            aria-label="GPT 생성 단계"
          >
            {ROOT_LEARNING_STAGES.map((stage) => (
              <li key={stage}>{stage}</li>
            ))}
          </ol>
        </div>
      );
      return (
        <GptArchitectureSceneFigure
          fallback={fallback}
          headCount={context.model.config.n_head}
          layerCount={context.model.config.n_layer}
          modelName={context.model.name}
          nextHref={
            context.course?.chapterHref("decoder.chapter.4.1") ??
            "#/learn/decoder-only-fundamentals/4-1"
          }
        />
      );
    },
  };
}
