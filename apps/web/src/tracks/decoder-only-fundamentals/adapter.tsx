import { AttentionDetail } from "../../architecture/attention";
import { TransformerBlockDetail } from "../../architecture/block";
import type { ArchitectureNodeId } from "../../architecture/catalog";
import { RootArchitecture } from "../../architecture/root/RootArchitecture";
import type { ArchitectureView } from "../../architecture/state";
import { validateProfileCompatibility } from "../compatibility";
import type {
  ArchitectureRenderContext,
  ArchitectureRouteDefinition,
  BreadcrumbItem,
  LearningGuidePage,
  LearningTrackAdapter,
  LearningTrackProfile,
} from "../types";
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
  return decoderGuidePage(routeId, context.model.config.n_layer);
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
    renderArchitecture: (context) => {
      const config = context.model.config;
      const activate = (nodeId: ArchitectureNodeId) => {
        context.navigate({
          type: "activate-node",
          nodeId,
          layerCount: config.n_layer,
          headCount: config.n_head,
        });
      };
      const navigateTo = (view: ArchitectureView) => {
        context.navigate({
          type: "navigate-breadcrumb",
          view,
          layerCount: config.n_layer,
        });
      };
      const selectLayer = (layer: number) => {
        context.navigate({
          type: "select-layer",
          layer,
          layerCount: config.n_layer,
        });
      };
      const selectHead = (head: number) => {
        context.navigate({
          type: "select-head",
          head,
          headCount: config.n_head,
        });
      };

      switch (context.state.view) {
        case "root":
          return (
            <RootArchitecture
              modelName={context.model.name}
              config={config}
              state={context.state}
              onActivate={activate}
              onOpenBlock={() => activate("transformer-block")}
            />
          );
        case "transformer-block":
          return (
            <TransformerBlockDetail
              config={config}
              selectedLayer={context.state.selectedLayer}
              selectedNodeId={context.state.selectedNodeId}
              onActivateNode={activate}
              onNavigate={navigateTo}
              onSelectLayer={selectLayer}
            />
          );
        case "self-attention":
          return (
            <AttentionDetail
              layerCount={config.n_layer}
              headCount={config.n_head}
              modelWidth={config.n_embd}
              traceSequenceLength={context.replaySequenceLength}
              selectedLayer={context.state.selectedLayer}
              selectedHead={context.state.selectedHead}
              selectedNodeId={context.state.selectedNodeId}
              onNavigateRoot={() => navigateTo("root")}
              onBack={() => navigateTo("transformer-block")}
              onSelectLayer={selectLayer}
              onSelectHead={selectHead}
              onSelectNode={activate}
            />
          );
      }
    },
  };
}
