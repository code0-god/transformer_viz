import type {
  GlossaryEntry,
  LearningGuideCatalog,
  LearningGuidePage,
  LearningRouteId,
} from "../types";
import { attentionGuide, attentionGuideGlossary } from "./attentionGuide";
import { decoderBlockGuide } from "./blockGuide";
import { blockGuideGlossary } from "./blockGuideGlossary";
import { decoderGuideRuntimeAdapterIds } from "./guideRuntime";
import { decoderRootGlossary } from "./rootGlossary";
import { decoderRootGuide } from "./rootGuide";

class DecoderGuideError extends Error {
  constructor(readonly routeId: LearningRouteId) {
    super(`Decoder guide page is missing: ${routeId}`);
    this.name = "DecoderGuideError";
  }
}

function uniqueGlossary(
  entries: readonly GlossaryEntry[],
): readonly GlossaryEntry[] {
  const byId = new Map<string, GlossaryEntry>();
  for (const entry of entries) byId.set(entry.id, entry);
  return [...byId.values()];
}

export const decoderGuideCatalog: LearningGuideCatalog = {
  pages: {
    "decoder.root": decoderRootGuide,
    "decoder.block": decoderBlockGuide,
    "decoder.self-attention": attentionGuide,
  },
  glossary: uniqueGlossary([
    ...decoderRootGlossary,
    ...blockGuideGlossary,
    ...attentionGuideGlossary,
  ]),
  runtimeAdapterIds: [
    decoderGuideRuntimeAdapterIds.rootFacts,
    decoderGuideRuntimeAdapterIds.blockFacts,
    decoderGuideRuntimeAdapterIds.attentionFacts,
  ],
  operationAdapterIds: [decoderGuideRuntimeAdapterIds.selectedOperation],
  figureIds: ["root"],
};

export function decoderGuidePage(routeId: LearningRouteId): LearningGuidePage {
  const page = decoderGuideCatalog.pages[routeId];
  if (page === undefined) throw new DecoderGuideError(routeId);
  return page;
}
