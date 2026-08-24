import { repeatedBlockLabel } from "../../domain/notation";
import type { GptConfig } from "../../generated/schema/GptConfig";
import type { ArchitectureNodeId } from "../catalog";
import type { ArchitectureView } from "../state";
import { BlockDiagram } from "./BlockDiagram";
import "./block.css";
import "./block-panel.css";

function layerIndexes(layerCount: number): number[] {
  const layers: number[] = [];
  for (let layer = 0; layer < layerCount; layer += 1) layers.push(layer);
  return layers;
}

export interface TransformerBlockDetailProps {
  readonly config: Pick<GptConfig, "n_layer">;
  readonly selectedLayer: number;
  readonly selectedNodeId: ArchitectureNodeId | null;
  readonly highlightedNodeIds?: readonly ArchitectureNodeId[];
  readonly onActivateNode: (id: ArchitectureNodeId) => void;
  readonly onNavigate: (view: ArchitectureView) => void;
  readonly onSelectLayer: (layer: number) => void;
}

export function TransformerBlockDetail({
  config,
  selectedLayer,
  selectedNodeId,
  highlightedNodeIds = [],
  onActivateNode,
  onNavigate,
  onSelectLayer,
}: TransformerBlockDetailProps) {
  const layerCount = config.n_layer;
  return (
    <section
      className="architecture-block-screen"
      aria-labelledby="architecture-title"
    >
      <nav
        className="architecture-breadcrumb"
        aria-label="Architecture navigation"
      >
        <ol>
          <li>
            <button
              type="button"
              data-testid="architecture-breadcrumb-gpt"
              onClick={() => onNavigate("root")}
            >
              GPT
            </button>
          </li>
          <li>
            <span aria-hidden="true">›</span>
            <span
              className="architecture-breadcrumb-current"
              data-testid="architecture-breadcrumb-block"
              aria-current="page"
            >
              {repeatedBlockLabel(layerCount)}
            </span>
          </li>
        </ol>
      </nav>

      <div className="architecture-intro">
        <div>
          <h2 id="architecture-title" tabIndex={-1}>
            Transformer Block
          </h2>
          <p>
            하나의 Pre-LN Decoder Block이 attention과 MLP residual을 계산하는
            흐름입니다.
          </p>
        </div>
        <button
          type="button"
          className="architecture-back-button"
          data-testid="architecture-back-root"
          onClick={() => onNavigate("root")}
        >
          ← 전체 구조
        </button>
      </div>

      <section
        className="architecture-detail"
        data-testid="architecture-detail"
        data-selected-layer={selectedLayer}
        aria-labelledby="architecture-title"
      >
        <div className="architecture-detail-toolbar">
          <div>
            <p className="architecture-detail-kicker">Pre-LN Decoder Block</p>
            <p>
              동일한 Block이 현재 모델에서{" "}
              <strong data-testid="architecture-model-layer-count">
                {layerCount}
              </strong>
              회 순차적으로 적용됩니다.
            </p>
          </div>
          <fieldset className="architecture-layer-selector">
            <legend>Layer</legend>
            <div>
              {layerIndexes(layerCount).map((layer) => (
                <button
                  key={layer}
                  type="button"
                  className={layer === selectedLayer ? "selected" : undefined}
                  aria-pressed={layer === selectedLayer}
                  data-layer-index={layer}
                  onClick={() => onSelectLayer(layer)}
                >
                  {layer}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="architecture-detail-grid">
          <BlockDiagram
            selectedNodeId={selectedNodeId}
            highlightedNodeIds={highlightedNodeIds}
            onActivateNode={onActivateNode}
          />
        </div>
      </section>
    </section>
  );
}
