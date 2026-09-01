import type { ReactElement } from "react";

import { RootArchitecture } from "../../architecture/root/RootArchitecture";
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
      return { preferredWidth: 832, renderer: "static" };
    },
    preferredWidth: (figureId): number => {
      if (figureId !== "root") throw new DecoderLearningFigureError(figureId);
      return 832;
    },
    render: (figureId): ReactElement => {
      if (figureId !== "root") throw new DecoderLearningFigureError(figureId);
      return (
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
          <a
            className="decoder-learning-architecture__next"
            href={
              context.course?.chapterHref("decoder.chapter.4.1") ??
              "#/learn/decoder-only-fundamentals/4-1"
            }
            aria-label="Transformer Block 설명으로 이동"
          >
            Transformer Block 설명으로 이동 →
          </a>
        </div>
      );
    },
  };
}
