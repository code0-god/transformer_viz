import { repeatedBlockLabel } from "../../domain/notation";
import type { GptConfig } from "../../generated/schema/GptConfig";
import { MathFormula } from "../../math/MathFormula";
import { integerParameterFormula } from "../../math/trustedFormulaBuilders";
import {
  decoderBlockGuide,
  decoderBlockGuideCopy,
  decoderBlockOperationIds,
} from "../../tracks/decoder-only-fundamentals/guide";
import { decoderOnlyFundamentalsProfile } from "../../tracks/decoder-only-fundamentals/profile";
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
  readonly onActivateNode: (id: ArchitectureNodeId) => void;
  readonly onNavigate: (view: ArchitectureView) => void;
  readonly onSelectLayer: (layer: number) => void;
}

export function TransformerBlockDetail({
  config,
  selectedLayer,
  selectedNodeId,
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
              동일한 Block이 현재 모델에서 {layerCount}회 순차적으로 적용됩니다.
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

        <div className="architecture-visual-grid architecture-detail-grid">
          <BlockDiagram
            selectedNodeId={selectedNodeId}
            onActivateNode={onActivateNode}
          />
          <aside
            className="architecture-annotation architecture-detail-annotation"
            data-guide-page-id={decoderBlockGuide.id}
            data-testid="architecture-block-equations"
          >
            <h3>{decoderBlockGuide.title}</h3>
            <p className="architecture-detail-layer">
              <span>{decoderBlockGuideCopy.currentModel}</span>
              <strong data-testid="architecture-model-layer-count">
                <MathFormula
                  formula={integerParameterFormula(
                    "block-layer-count-value",
                    layerCount,
                  )}
                />
              </strong>
              <span>
                {decoderBlockGuideCopy.selectedLayer} {selectedLayer}
              </span>
            </p>
            <ol>
              {decoderBlockOperationIds.map((id) => (
                <li key={id}>
                  {decoderOnlyFundamentalsProfile.notation.entries[id].title}
                </li>
              ))}
            </ol>
            <div className="architecture-detail-formulas">
              <span>{decoderBlockGuideCopy.formulas}</span>
              {decoderBlockOperationIds.map((id) => (
                <MathFormula
                  key={id}
                  formula={decoderOnlyFundamentalsProfile.notation.formulas[id]}
                  displayMode
                  className="architecture-detail-formula"
                />
              ))}
            </div>
          </aside>
        </div>
      </section>
    </section>
  );
}
