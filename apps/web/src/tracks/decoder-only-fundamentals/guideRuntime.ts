import type {
  ArchitectureRenderContext,
  RuntimeFactsPresentation,
  SelectedOperationPresentation,
} from "../types";
import {
  type DecoderRuntimeFactsAdapterId,
  resolveRuntimeFacts,
} from "./guideRuntimeFacts";
import { resolveSelectedOperation } from "./guideRuntimeOperations";

export const decoderGuideRuntimeAdapterIds = {
  rootFacts: "decoder.runtime.root-facts",
  blockFacts: "decoder.runtime.block-facts",
  attentionFacts: "decoder.runtime.attention-facts",
  selectedOperation: "decoder.runtime.selected-operation",
} as const;

export function resolveDecoderRuntimeFacts(
  adapterId: DecoderRuntimeFactsAdapterId,
  context: ArchitectureRenderContext,
): RuntimeFactsPresentation {
  return resolveRuntimeFacts(adapterId, context);
}

export function resolveDecoderSelectedOperation(
  adapterId: typeof decoderGuideRuntimeAdapterIds.selectedOperation,
  context: ArchitectureRenderContext,
): SelectedOperationPresentation | null {
  switch (adapterId) {
    case "decoder.runtime.selected-operation":
      return resolveSelectedOperation(context);
  }
}
