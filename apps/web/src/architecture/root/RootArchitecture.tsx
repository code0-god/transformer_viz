import type { ReactElement } from "react";
import { repeatedBlockLabel } from "../../domain/notation";
import type { GptConfig } from "../../generated/schema/GptConfig";
import type { ArchitectureNodeId } from "../catalog";
import type { ArchitectureState } from "../state";
import { diagramLayout, VIEW_WIDTH } from "./layout";
import { Pipeline } from "./Pipeline";
import "./rootArchitecture.css";

export interface RootArchitectureProps {
  readonly modelName: string;
  readonly config: GptConfig;
  readonly state: Pick<ArchitectureState, "selectedNodeId">;
  readonly onActivate: (id: ArchitectureNodeId) => void;
  readonly onOpenBlock: () => void;
}

export function RootArchitecture({
  modelName,
  config,
  state,
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
        {` · ${config.n_layer} layers · ${config.n_head} heads · d_model ${config.n_embd} · context ${config.block_size}`}
      </p>
      <div className="architecture-visual-grid">
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
        <aside
          className="architecture-annotation"
          aria-labelledby="architecture-annotation-title"
        >
          <h3 id="architecture-annotation-title">구조 설명</h3>
          <ul>
            <li>
              <strong>{repeatedBlockLabel(config.n_layer)}</strong>
              <span>{`동일한 Block이 ${config.n_layer}번 순차적으로 적용됩니다.`}</span>
            </li>
            <li>
              <strong>반복 Block 범위</strong>
              <span>
                LN1 · Causal Self-Attention · Residual Add · LN2 · MLP ·
                Residual Add
              </span>
            </li>
            <li>
              <strong>Final LayerNorm</strong>
              <span>
                반복 Block 바깥에서 마지막 hidden state를 정규화합니다.
              </span>
            </li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
