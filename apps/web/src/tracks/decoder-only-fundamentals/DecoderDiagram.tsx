import type { ReactElement } from "react";

import { AttentionDetail } from "../../architecture/attention";
import { TransformerBlockDetail } from "../../architecture/block";
import type { ArchitectureNodeId } from "../../architecture/catalog";
import { RootArchitecture } from "../../architecture/root/RootArchitecture";
import type { ArchitectureView } from "../../architecture/state";
import type { ArchitectureRenderContext } from "../types";

type DecoderDiagramProps = {
  readonly context: ArchitectureRenderContext;
  readonly highlightedNodeIds: readonly ArchitectureNodeId[];
  readonly activateNode: (nodeId: ArchitectureNodeId) => void;
  readonly navigateTo: (view: ArchitectureView) => void;
  readonly selectLayer: (layer: number) => void;
  readonly selectHead: (head: number) => void;
  readonly showRouteControls?: boolean;
};

export function DecoderDiagram({
  context,
  highlightedNodeIds,
  activateNode,
  navigateTo,
  selectLayer,
  selectHead,
  showRouteControls = false,
}: DecoderDiagramProps): ReactElement {
  switch (context.state.view) {
    case "root":
      return (
        <RootArchitecture
          modelName={context.model.name}
          config={context.model.config}
          state={context.state}
          highlightedNodeIds={highlightedNodeIds}
          onActivate={activateNode}
          onOpenBlock={() => activateNode("transformer-block")}
        />
      );
    case "transformer-block":
      return (
        <TransformerBlockDetail
          config={context.model.config}
          selectedLayer={context.state.selectedLayer}
          selectedNodeId={context.state.selectedNodeId}
          highlightedNodeIds={highlightedNodeIds}
          showRouteControls={showRouteControls}
          onActivateNode={activateNode}
          onNavigate={navigateTo}
          onSelectLayer={selectLayer}
        />
      );
    case "self-attention":
      return (
        <AttentionDetail
          layerCount={context.model.config.n_layer}
          headCount={context.model.config.n_head}
          modelWidth={context.model.config.n_embd}
          traceSequenceLength={context.replaySequenceLength}
          selectedLayer={context.state.selectedLayer}
          selectedHead={context.state.selectedHead}
          selectedNodeId={context.state.selectedNodeId}
          highlightedNodeIds={highlightedNodeIds}
          showRouteControls={showRouteControls}
          onNavigateRoot={() => navigateTo("root")}
          onBack={() => navigateTo("transformer-block")}
          onSelectLayer={selectLayer}
          onSelectHead={selectHead}
          onSelectNode={activateNode}
        />
      );
  }
}
