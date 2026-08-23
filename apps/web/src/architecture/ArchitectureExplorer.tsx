import type { ModelMetadata } from "../generated/schema";
import { AttentionDetail } from "./attention";
import { TransformerBlockDetail } from "./block";
import type { ArchitectureNodeId } from "./catalog";
import { RootArchitecture } from "./root/RootArchitecture";
import type {
  ArchitectureAction,
  ArchitectureState,
  ArchitectureView,
} from "./state";

export interface ArchitectureExplorerProps {
  readonly model: Readonly<ModelMetadata> | null;
  readonly state: ArchitectureState;
  readonly replaySequenceLength: number | null;
  readonly navigate: (action: ArchitectureAction) => void;
}

export function ArchitectureExplorer({
  model,
  state,
  replaySequenceLength,
  navigate,
}: ArchitectureExplorerProps) {
  if (model === null) {
    return (
      <section
        className="architecture-shell architecture-loading"
        aria-live="polite"
      >
        <span className="architecture-loading-mark" aria-hidden="true" />
        <p>학습용 모델 구조를 불러오고 있습니다.</p>
      </section>
    );
  }
  const config = model.config;
  const activate = (nodeId: ArchitectureNodeId) => {
    navigate({
      type: "activate-node",
      nodeId,
      layerCount: config.n_layer,
      headCount: config.n_head,
    });
  };
  const navigateTo = (view: ArchitectureView) => {
    navigate({
      type: "navigate-breadcrumb",
      view,
      layerCount: config.n_layer,
    });
  };
  const selectLayer = (layer: number) => {
    navigate({ type: "select-layer", layer, layerCount: config.n_layer });
  };
  const selectHead = (head: number) => {
    navigate({ type: "select-head", head, headCount: config.n_head });
  };

  return (
    <section className="architecture-shell">
      {state.view === "root" ? (
        <RootArchitecture
          modelName={model.name}
          config={config}
          state={state}
          onActivate={activate}
          onOpenBlock={() => activate("transformer-block")}
        />
      ) : null}
      {state.view === "transformer-block" ? (
        <TransformerBlockDetail
          config={config}
          selectedLayer={state.selectedLayer}
          selectedNodeId={state.selectedNodeId}
          onActivateNode={activate}
          onNavigate={navigateTo}
          onSelectLayer={selectLayer}
        />
      ) : null}
      {state.view === "self-attention" ? (
        <AttentionDetail
          layerCount={config.n_layer}
          headCount={config.n_head}
          modelWidth={config.n_embd}
          traceSequenceLength={replaySequenceLength}
          selectedLayer={state.selectedLayer}
          selectedHead={state.selectedHead}
          selectedNodeId={state.selectedNodeId}
          onNavigateRoot={() => navigateTo("root")}
          onBack={() => navigateTo("transformer-block")}
          onSelectLayer={selectLayer}
          onSelectHead={selectHead}
          onSelectNode={activate}
        />
      ) : null}
    </section>
  );
}
