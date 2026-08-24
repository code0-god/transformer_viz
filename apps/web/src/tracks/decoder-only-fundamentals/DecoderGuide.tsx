import type { ReactElement } from "react";

import type { ArchitectureView } from "../../architecture/state";
import { LearningGuide } from "../LearningGuide";
import type {
  ArchitectureRenderContext,
  LearningGuidePage,
  LearningGuideSection,
  LearningNodeId,
  LearningTrackProfile,
} from "../types";
import {
  decoderGuideRuntimeAdapterIds,
  resolveDecoderRuntimeFacts,
  resolveDecoderSelectedOperation,
} from "./guideRuntime";

class DecoderGuideNavigationError extends Error {
  constructor(readonly routeId: string) {
    super(`Decoder Guide navigation target is unsupported: ${routeId}`);
    this.name = "DecoderGuideNavigationError";
  }
}

type DecoderGuideProps = {
  readonly context: ArchitectureRenderContext;
  readonly profile: LearningTrackProfile;
  readonly page: LearningGuidePage;
  readonly activeSectionId: string | null;
  readonly selectedNodeId: LearningNodeId | undefined;
  readonly onSectionFocus: (section: LearningGuideSection) => void;
  readonly onSectionRef: (
    sectionId: string,
    element: HTMLElement | null,
  ) => void;
  readonly navigateTo: (view: ArchitectureView) => void;
};

export function DecoderGuide({
  context,
  profile,
  page,
  activeSectionId,
  selectedNodeId,
  onSectionFocus,
  onSectionRef,
  navigateTo,
}: DecoderGuideProps): ReactElement {
  const runtimeFacts = {
    [decoderGuideRuntimeAdapterIds.rootFacts]: resolveDecoderRuntimeFacts(
      decoderGuideRuntimeAdapterIds.rootFacts,
      context,
    ),
    [decoderGuideRuntimeAdapterIds.blockFacts]: resolveDecoderRuntimeFacts(
      decoderGuideRuntimeAdapterIds.blockFacts,
      context,
    ),
    [decoderGuideRuntimeAdapterIds.attentionFacts]: resolveDecoderRuntimeFacts(
      decoderGuideRuntimeAdapterIds.attentionFacts,
      context,
    ),
  };
  const selectedOperation = resolveDecoderSelectedOperation(
    decoderGuideRuntimeAdapterIds.selectedOperation,
    context,
  );
  const selectedOperations =
    selectedOperation === null
      ? {}
      : {
          [decoderGuideRuntimeAdapterIds.selectedOperation]: selectedOperation,
        };

  return (
    <LearningGuide
      page={page}
      glossary={profile.guide.glossary}
      formulas={profile.notation.formulas}
      runtimeFacts={runtimeFacts}
      selectedOperations={selectedOperations}
      {...(activeSectionId === null ? {} : { activeSectionId })}
      {...(selectedNodeId === undefined ? {} : { selectedNodeId })}
      onSectionFocus={onSectionFocus}
      onSectionRef={onSectionRef}
      onNavigate={(nextStep) => {
        switch (nextStep.routeId) {
          case "decoder.root":
            navigateTo("root");
            break;
          case "decoder.block":
            navigateTo("transformer-block");
            break;
          case "decoder.self-attention":
            navigateTo("self-attention");
            break;
          default:
            throw new DecoderGuideNavigationError(nextStep.routeId);
        }
      }}
    />
  );
}
