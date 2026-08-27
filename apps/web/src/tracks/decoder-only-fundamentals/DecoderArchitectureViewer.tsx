import {
  type ArchitectureNodeId,
  architectureNodeCatalog,
} from "../../architecture/catalog";
import type { ArchitectureView } from "../../architecture/state";
import type {
  ArchitectureRenderContext,
  FocusedArchitectureOptions,
  FocusedArchitecturePresentation,
} from "../types";
import { DecoderDiagram } from "./DecoderDiagram";
import { DecoderRouteControls } from "./DecoderRouteControls";
import { guideSectionForNode } from "./decoderWorkspaceSections";
import { decoderGuidePage } from "./guide";
import { decoderLearningNodeByArchitecture } from "./nodes";
import { decoderRoute, decoderRouteId } from "./routes";

export function createDecoderArchitecturePresentation({
  context,
  options,
}: Readonly<{
  context: ArchitectureRenderContext;
  options: FocusedArchitectureOptions;
}>): FocusedArchitecturePresentation {
  const routeId = decoderRouteId(decoderRoute(context.state));
  const page = decoderGuidePage(routeId);

  const navigateTo = (view: ArchitectureView): void => {
    if (view === "self-attention") {
      context.navigate({
        type: "activate-node",
        nodeId: "self-attention",
        layerCount: context.model.config.n_layer,
        headCount: context.model.config.n_head,
      });
      return;
    }
    context.navigate({
      type: "navigate-breadcrumb",
      view,
      layerCount: context.model.config.n_layer,
    });
  };

  const activateNode = (nodeId: ArchitectureNodeId): void => {
    context.navigate({
      type: "activate-node",
      nodeId,
      layerCount: context.model.config.n_layer,
      headCount: context.model.config.n_head,
    });
    if (architectureNodeCatalog[nodeId].capability === "drill-down") return;
    const learningNodeId = decoderLearningNodeByArchitecture[nodeId];
    if (learningNodeId === undefined) return;
    const section = guideSectionForNode(page, learningNodeId);
    if (section === undefined) return;
    options.onArticleTargetChange?.(`${page.id}-${section.id}-title`);
  };

  const selectLayer = (layer: number): void => {
    context.navigate({
      type: "select-layer",
      layer,
      layerCount: context.model.config.n_layer,
    });
  };
  const selectHead = (head: number): void => {
    context.navigate({
      type: "select-head",
      head,
      headCount: context.model.config.n_head,
    });
  };

  const controls =
    context.state.view === "root" ? undefined : (
      <DecoderRouteControls
        context={context}
        navigateRoot={() => navigateTo("root")}
        navigateBlock={() => navigateTo("transformer-block")}
        selectLayer={selectLayer}
        selectHead={selectHead}
      />
    );

  return {
    content: (
      <DecoderDiagram
        context={context}
        highlightedNodeIds={options.highlightedNodeIds}
        activateNode={activateNode}
        navigateTo={navigateTo}
        selectLayer={selectLayer}
        selectHead={selectHead}
      />
    ),
    ...(controls === undefined ? {} : { controls }),
  };
}
