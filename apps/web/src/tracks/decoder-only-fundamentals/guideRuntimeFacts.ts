import { currentAttentionShapes } from "../../domain/shapes";
import { shapeFormula } from "../../math/trustedFormulaBuilders";
import type {
  ArchitectureRenderContext,
  RuntimeFactPresentation,
  RuntimeFactsPresentation,
} from "../types";

export type DecoderRuntimeFactsAdapterId =
  | "decoder.runtime.root-facts"
  | "decoder.runtime.block-facts"
  | "decoder.runtime.attention-facts";

const pendingValue = "실행 후 표시";

function pendingFact(
  id: string,
  label: string,
  detail?: string,
): RuntimeFactPresentation {
  return {
    id,
    label,
    value: pendingValue,
    status: "pending",
    ...(detail === undefined ? {} : { detail }),
  };
}

function rootFacts(
  context: ArchitectureRenderContext,
): RuntimeFactsPresentation {
  const config = context.model.config;
  return {
    id: "decoder.runtime.root-facts",
    facts: [
      {
        id: "decoder.fact.blocks",
        label: "Blocks",
        value: String(config.n_layer),
        status: "ready",
        detail: "ModelMetadata.config.n_layer",
      },
      {
        id: "decoder.fact.heads",
        label: "Heads",
        value: String(config.n_head),
        status: "ready",
        detail: "ModelMetadata.config.n_head",
      },
      {
        id: "decoder.fact.model-width",
        label: "C",
        value: String(config.n_embd),
        status: "ready",
        detail: "ModelMetadata.config.n_embd",
      },
      {
        id: "decoder.fact.context-window",
        label: "Context window",
        value: String(config.block_size),
        status: "ready",
        detail: "ModelMetadata.config.block_size",
      },
      {
        id: "decoder.fact.vocabulary",
        label: "Vocabulary",
        value: String(config.vocab_size),
        status: "ready",
        detail: "ModelMetadata.config.vocab_size",
      },
    ],
  };
}

function blockFacts(
  context: ArchitectureRenderContext,
): RuntimeFactsPresentation {
  return {
    id: "decoder.runtime.block-facts",
    facts: [
      {
        id: "decoder.fact.selected-layer",
        label: "Selected layer",
        value: String(context.state.selectedLayer),
        status: "ready",
      },
      {
        id: "decoder.fact.blocks",
        label: "Blocks",
        value: String(context.model.config.n_layer),
        status: "ready",
        detail: "ModelMetadata.config.n_layer",
      },
      {
        id: "decoder.fact.model-width",
        label: "C",
        value: String(context.model.config.n_embd),
        status: "ready",
        detail: "ModelMetadata.config.n_embd",
      },
    ],
  };
}

function attentionFacts(
  context: ArchitectureRenderContext,
): RuntimeFactsPresentation {
  const config = context.model.config;
  const shapes = currentAttentionShapes(
    { modelWidth: config.n_embd, headCount: config.n_head },
    context.replaySequenceLength,
  );
  const sequenceLength = shapes?.sequenceLength ?? null;
  const headDimension = shapes?.headDimension;
  const scaleFactor = shapes?.scaleFactor;
  const headShape = shapes?.headTensor ?? null;
  const fullHeadShape = shapes?.fullHeadTensor ?? null;
  return {
    id: "decoder.runtime.attention-facts",
    facts: [
      {
        id: "decoder.fact.selected-layer",
        label: "Selected layer",
        value: String(context.state.selectedLayer),
        status: "ready",
      },
      {
        id: "decoder.fact.selected-head",
        label: "Selected head",
        value: String(context.state.selectedHead),
        status: "ready",
      },
      sequenceLength === null
        ? {
            ...pendingFact("decoder.fact.sequence-length", "T"),
            value: "—",
            detail: "replaySequenceLength",
          }
        : {
            id: "decoder.fact.sequence-length",
            label: "T",
            value: String(sequenceLength),
            status: "ready",
            detail: "replaySequenceLength",
          },
      {
        id: "decoder.fact.model-width",
        label: "C",
        value: String(config.n_embd),
        status: "ready",
        detail: "ModelMetadata.config.n_embd",
      },
      {
        id: "decoder.fact.heads",
        label: "H",
        value: String(config.n_head),
        status: "ready",
        detail: "ModelMetadata.config.n_head",
      },
      headDimension === undefined
        ? pendingFact("decoder.fact.head-dimension", "D", "C / H")
        : {
            id: "decoder.fact.head-dimension",
            label: "D",
            value: String(headDimension),
            status: "ready",
            detail: `C / H = ${config.n_embd} / ${config.n_head}`,
          },
      scaleFactor === undefined || headDimension === undefined
        ? pendingFact("decoder.fact.scale-factor", "1 / sqrt(D)", "1 / sqrt(D)")
        : {
            id: "decoder.fact.scale-factor",
            label: "1 / sqrt(D)",
            value: String(scaleFactor),
            status: "ready",
            detail: `1 / sqrt(D) = 1 / sqrt(${headDimension})`,
          },
      headShape === null
        ? pendingFact("decoder.fact.qkv-head-shape", "Q / K / V")
        : {
            id: "decoder.fact.qkv-head-shape",
            label: "Q / K / V",
            value: shapeFormula(
              "attention-head-shape",
              headShape,
              "Current Q K V head shape",
            ).plainText,
            status: "ready",
          },
      fullHeadShape === null
        ? pendingFact("decoder.fact.qkv-full-shape", "Full Q / K / V")
        : {
            id: "decoder.fact.qkv-full-shape",
            label: "Full Q / K / V",
            value: shapeFormula(
              "attention-full-head-shape",
              fullHeadShape,
              "Current full Q K V shape",
            ).plainText,
            status: "ready",
          },
    ],
  };
}

export function resolveRuntimeFacts(
  adapterId: DecoderRuntimeFactsAdapterId,
  context: ArchitectureRenderContext,
): RuntimeFactsPresentation {
  switch (adapterId) {
    case "decoder.runtime.root-facts":
      return rootFacts(context);
    case "decoder.runtime.block-facts":
      return blockFacts(context);
    case "decoder.runtime.attention-facts":
      return attentionFacts(context);
  }
}
