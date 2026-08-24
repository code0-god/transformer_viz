import { validateProfileCompatibility } from "../compatibility";
import type {
  ArchitectureRenderContext,
  ArchitectureRouteDefinition,
  BreadcrumbItem,
  LearningGuidePage,
  LearningTrackAdapter,
  LearningTrackProfile,
} from "../types";
import { DecoderLearningWorkspace } from "./DecoderLearningWorkspace";
import { decoderGuidePage } from "./guide";
import { decoderRoute, decoderRouteId } from "./routes";

class DecoderProfileError extends Error {
  constructor(readonly routeId: string) {
    super(`Decoder profile route is incomplete: ${routeId}`);
    this.name = "DecoderProfileError";
  }
}

function routeDefinition(
  profile: LearningTrackProfile,
  routeId: string,
): ArchitectureRouteDefinition {
  const route = profile.routes.definitions.find(({ id }) => id === routeId);
  if (route === undefined) throw new DecoderProfileError(routeId);
  return route;
}

function guidePage(context: ArchitectureRenderContext): LearningGuidePage {
  const routeId = decoderRouteId(decoderRoute(context.state));
  return decoderGuidePage(routeId);
}

export function createDecoderOnlyFundamentalsAdapter(
  profile: LearningTrackProfile,
): LearningTrackAdapter {
  return {
    profile,
    supportsModel: (metadata) =>
      validateProfileCompatibility(profile, metadata).compatible,
    getInitialRoute: () =>
      routeDefinition(profile, profile.routes.initialRouteId),
    getBreadcrumbs: ({ model, state }) => {
      const block = `Transformer Block × ${model.config.n_layer}`;
      const root: BreadcrumbItem = {
        id: "decoder.root",
        label: "GPT",
        current: state.view === "root",
      };
      switch (state.view) {
        case "root":
          return [root];
        case "transformer-block":
          return [root, { id: "decoder.block", label: block, current: true }];
        case "self-attention":
          return [
            root,
            { id: "decoder.block", label: block, current: false },
            {
              id: "decoder.self-attention",
              label: "Self-Attention",
              current: true,
            },
          ];
      }
    },
    getGuidePage: (context) => guidePage(context),
    getAvailableRoutes: () => profile.routes.definitions,
    renderArchitecture: (context) => (
      <DecoderLearningWorkspace context={context} profile={profile} />
    ),
  };
}
