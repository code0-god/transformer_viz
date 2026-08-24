import type { ReactElement } from "react";
import type { GptConfig } from "../../generated/schema/GptConfig";
import { MathFormula } from "../../math/MathFormula";
import { integerParameterFormula } from "../../math/trustedFormulaBuilders";
import type { ArchitectureNodeId } from "../catalog";
import type { ArchitectureState } from "../state";
import { diagramLayout, VIEW_WIDTH } from "./layout";
import { Pipeline } from "./Pipeline";
import "./rootArchitecture.css";

export interface RootArchitectureProps {
  readonly modelName: string;
  readonly config: GptConfig;
  readonly state: Pick<ArchitectureState, "selectedNodeId">;
  readonly highlightedNodeIds?: readonly ArchitectureNodeId[];
  readonly onActivate: (id: ArchitectureNodeId) => void;
  readonly onOpenBlock: () => void;
}

export function RootArchitecture({
  modelName,
  config,
  state,
  highlightedNodeIds = [],
  onActivate,
  onOpenBlock,
}: RootArchitectureProps): ReactElement {
  const layout = diagramLayout(config.n_layer);

  function activate(id: ArchitectureNodeId): void {
    if (id === "transformer-block") onOpenBlock();
    else onActivate(id);
  }

  return (
    <section className="architecture-root-screen" aria-label="GPT Architecture">
      <p className="architecture-metadata">
        <strong>{modelName}</strong>
        {` · ${config.n_layer} layers · ${config.n_head} heads · `}
        <span data-testid="architecture-model-width">
          <MathFormula
            formula={integerParameterFormula(
              "root-model-width-value",
              config.n_embd,
            )}
          />
        </span>
        {` · context ${config.block_size}`}
      </p>
      <figure className="architecture-figure">
        <section
          className="architecture-svg-scroll"
          aria-label="Scrollable Transformer architecture diagram"
        >
          <svg
            className="architecture-diagram"
            data-testid="architecture-root"
            viewBox={`0 0 ${VIEW_WIDTH} ${layout.viewHeight}`}
            style={{ aspectRatio: `${VIEW_WIDTH} / ${layout.viewHeight}` }}
            role="img"
            aria-labelledby="architecture-svg-title architecture-svg-desc"
            preserveAspectRatio="xMidYMid meet"
          >
            <title id="architecture-svg-title">
              GPT text generation architecture
            </title>
            <desc id="architecture-svg-desc">
              {`Input tokens pass through token and position embeddings, ${config.n_layer} Pre-LN Transformer blocks, final LayerNorm, language-model head, logits, sampling, and generated-token append before the full context is forwarded again.`}
            </desc>
            <defs>
              <marker
                id="architecture-arrow"
                viewBox="0 0 10 10"
                refX={10}
                refY={5}
                markerWidth={7}
                markerHeight={7}
                orient="auto-start-reverse"
                overflow="visible"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
            </defs>
            <Pipeline
              layerCount={config.n_layer}
              layout={layout}
              selectedNodeId={state.selectedNodeId}
              highlightedNodeIds={highlightedNodeIds}
              onActivate={activate}
            />
          </svg>
        </section>
        <figcaption>
          다음 generation step: 생성된 토큰을 context에 추가한 뒤, 늘어난
          context 전체를 다시 Transformer에 입력합니다. 이 교육용 모델은 KV
          cache를 사용하지 않습니다.
        </figcaption>
      </figure>
    </section>
  );
}
