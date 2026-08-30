import type { ReactElement } from "react";

import { RootArchitecture } from "../../architecture/root/RootArchitecture";
import { SelfAttentionSceneFigure } from "../learning-scenes/attention/SelfAttentionSceneFigure";
import { TransformerBlockSceneFigure } from "../learning-scenes/block/TransformerBlockSceneFigure";
import { GptArchitectureSceneFigure } from "../learning-scenes/gpt/GptArchitectureSceneFigure";
import type { LearningFigureRegistry } from "../learningFigureTypes";
import type { ArchitectureRenderContext } from "../types";

const DECODER_FIGURE_IDS: ReadonlySet<string> = new Set([
  "root",
  "self-attention",
  "transformer-block",
]);
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
const BLOCK_LEARNING_STAGES = [
  { id: "x-in", label: "X_in" },
  { id: "ln-1", label: "LN₁" },
  { id: "attention", label: "Attention" },
  { id: "add-1", label: "Add" },
  { id: "ln-2", label: "LN₂" },
  { id: "mlp", label: "MLP" },
  { id: "add-2", label: "Add" },
  { id: "x-out", label: "X_out" },
] as const;
const ATTENTION_LEARNING_STAGES = [
  { id: "input", label: "Input X" },
  { id: "qkv", label: "Q / K / V" },
  { id: "scores", label: "QKᵀ / √D" },
  { id: "mask", label: "Causal Mask" },
  { id: "softmax", label: "Softmax" },
  { id: "value", label: "Weighted V" },
  { id: "merge", label: "Head Merge" },
  { id: "projection", label: "Output Projection" },
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
    figureIds: DECODER_FIGURE_IDS,
    metadata: (figureId) => {
      if (figureId === "root") {
        return {
          fallbackFigureId: "root.static",
          loadingStrategy: "visible",
          preferredAspectRatio: 1.62,
          preferredWidth: 1000,
          reducedMotion: "static-final-state",
          renderer: "scene",
        };
      }
      if (figureId === "transformer-block") {
        return {
          fallbackFigureId: "transformer-block.static",
          loadingStrategy: "visible",
          preferredAspectRatio: 1.68,
          preferredWidth: 1000,
          reducedMotion: "static-final-state",
          renderer: "scene",
        };
      }
      if (figureId === "self-attention") {
        return {
          fallbackFigureId: "self-attention.static",
          loadingStrategy: "visible",
          preferredAspectRatio: 1.48,
          preferredWidth: 1000,
          reducedMotion: "static-final-state",
          renderer: "scene",
        };
      }
      throw new DecoderLearningFigureError(figureId);
    },
    preferredWidth: (figureId): number => {
      if (!DECODER_FIGURE_IDS.has(figureId)) {
        throw new DecoderLearningFigureError(figureId);
      }
      return 1000;
    },
    render: (figureId): ReactElement => {
      if (figureId === "self-attention") {
        const fallback = (
          <div
            className="attention-scene__fallback"
            role="img"
            aria-label="Causal Self-Attention static flow"
          >
            <ol>
              {ATTENTION_LEARNING_STAGES.map((stage) => (
                <li key={stage.id}>{stage.label}</li>
              ))}
            </ol>
            <div>
              <code>S = QKᵀ / √D</code>
              <code>A = softmax(mask(S))</code>
              <code>Y = AV</code>
            </div>
          </div>
        );
        return (
          <SelfAttentionSceneFigure
            fallback={fallback}
            headCount={context.model.config.n_head}
            layerCount={context.model.config.n_layer}
          />
        );
      }
      if (figureId === "transformer-block") {
        const fallback = (
          <div
            className="block-scene__fallback"
            role="img"
            aria-label="Pre-LN Transformer Block static flow"
          >
            <ol>
              {BLOCK_LEARNING_STAGES.map((stage) => (
                <li key={stage.id}>{stage.label}</li>
              ))}
            </ol>
            <p>Pre-LN main path with two residual bypass and merge points.</p>
          </div>
        );
        return (
          <TransformerBlockSceneFigure
            fallback={fallback}
            layerCount={context.model.config.n_layer}
          />
        );
      }
      if (figureId === "root") {
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
      }
      throw new DecoderLearningFigureError(figureId);
    },
  };
}
