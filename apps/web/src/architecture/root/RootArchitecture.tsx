import type { ReactElement } from "react";
import type { GptConfig } from "../../generated/schema/GptConfig";
import { MathFormula } from "../../math/MathFormula";
import { integerParameterFormula } from "../../math/trustedFormulaBuilders";
import type { ArchitectureNodeId } from "../catalog";
import type { ArchitectureState } from "../state";
import { diagramLayout, VIEW_WIDTH } from "./layout";
import { Pipeline } from "./Pipeline";
import "./rootArchitecture.css";

const EMPTY_HIGHLIGHTED_NODE_IDS: readonly ArchitectureNodeId[] = [];

type RootArchitectureBaseProps = Readonly<{
  readonly modelName: string;
  readonly config: GptConfig;
  readonly state: Pick<ArchitectureState, "selectedNodeId">;
  readonly highlightedNodeIds?: readonly ArchitectureNodeId[];
}>;

type RootArchitectureInspectionProps = Readonly<{
  presentation?: "inspection";
  onActivate: (id: ArchitectureNodeId) => void;
  onOpenBlock: () => void;
}>;

type RootArchitectureLearnProps = Readonly<{
  presentation: "learn";
  onActivate?: never;
  onOpenBlock?: never;
}>;

export type RootArchitectureProps = RootArchitectureBaseProps &
  (RootArchitectureInspectionProps | RootArchitectureLearnProps);

export function RootArchitecture({
  modelName,
  config,
  state,
  highlightedNodeIds = EMPTY_HIGHLIGHTED_NODE_IDS,
  presentation = "inspection",
  onActivate,
  onOpenBlock,
}: RootArchitectureProps): ReactElement {
  const layout = diagramLayout(config.n_layer);
  const interactive = presentation === "inspection";

  function activate(id: ArchitectureNodeId): void {
    if (!interactive) return;
    if (id === "transformer-block") onOpenBlock?.();
    else onActivate?.(id);
  }

  const diagram = (
    <section
      className="architecture-svg-scroll"
      aria-label="Transformer architecture diagram"
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
          {`Input context passes through token and position embeddings, ${config.n_layer} grouped Transformer blocks, final LayerNorm, language-model head, logits, token selection, and context update.`}
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
          interactive={interactive}
          onActivate={activate}
        />
      </svg>
    </section>
  );
  const framedDiagram =
    presentation === "learn" ? (
      <div
        className="architecture-figure"
        data-figure-type="architecture-process"
        data-figure-question="What are the major stages from context to next token?"
      >
        {diagram}
      </div>
    ) : (
      <figure
        className="architecture-figure"
        data-figure-type="architecture-process"
        data-figure-question="What are the major stages from context to next token?"
      >
        {diagram}
        <figcaption>
          생성된 토큰을 context에 추가한 뒤, 늘어난 context 전체를 다음
          generation step의 입력으로 다시 사용합니다.
        </figcaption>
      </figure>
    );

  return (
    <section
      className="architecture-root-screen"
      aria-label="GPT Architecture"
      data-architecture-presentation={presentation}
    >
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
      {framedDiagram}
    </section>
  );
}
