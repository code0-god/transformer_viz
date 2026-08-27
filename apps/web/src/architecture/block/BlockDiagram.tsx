import { formulaCatalog } from "../../math/formulaCatalog";
import { MathFormula } from "../../math/MathFormula";
import type { ArchitectureNodeId } from "../catalog";
import { BlockConnectors, ResidualJunctions } from "./BlockConnectors";
import { AddNode, ModuleNode, StateNode } from "./BlockNodes";
import {
  ADD1_Y,
  ADD2_Y,
  ATTENTION_HEIGHT,
  ATTENTION_Y,
  BLOCK_HEIGHT,
  BLOCK_WIDTH,
  INPUT_Y,
  LN_HEIGHT,
  LN1_Y,
  LN2_Y,
  MLP_HEIGHT,
  MLP_Y,
  OUTPUT_Y,
  RESIDUAL_STATE_Y,
} from "./blockGeometry";

interface BlockDiagramProps {
  readonly selectedNodeId: ArchitectureNodeId | null;
  readonly highlightedNodeIds?: readonly ArchitectureNodeId[];
  readonly onActivateNode: (id: ArchitectureNodeId) => void;
}

export function BlockDiagram({
  selectedNodeId,
  highlightedNodeIds = [],
  onActivateNode,
}: BlockDiagramProps) {
  const interaction = {
    selectedNodeId,
    highlightedNodeIds,
    onActivateNode,
  };
  return (
    <figure className="architecture-figure architecture-detail-figure">
      <section
        className="architecture-svg-scroll architecture-detail-scroll"
        aria-label="Transformer Block detail diagram"
      >
        <svg
          className="architecture-diagram architecture-detail-diagram"
          viewBox={`0 0 ${BLOCK_WIDTH} ${BLOCK_HEIGHT}`}
          role="img"
          aria-labelledby="block-detail-svg-title block-detail-svg-desc"
          preserveAspectRatio="xMidYMid meet"
        >
          <title id="block-detail-svg-title">
            Pre-LN Transformer Block data flow
          </title>
          <desc id="block-detail-svg-desc">
            Block input branches through two ordered normalization, module, and
            residual-add paths before reaching Block output.
          </desc>
          <defs>
            <marker
              id="block-detail-arrow"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
              overflow="visible"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
          </defs>
          <StateNode
            y={INPUT_Y}
            title="Block Input"
            formulaId="block-input-state"
            state="block-input"
          />
          <ModuleNode
            id="layer-norm-1"
            className="architecture-block-normalization"
            y={LN1_Y}
            height={LN_HEIGHT}
            {...interaction}
          />
          <ModuleNode
            id="self-attention"
            className="architecture-block-attention"
            y={ATTENTION_Y}
            height={ATTENTION_HEIGHT}
            {...interaction}
          />
          <AddNode id="residual-1" y={ADD1_Y} {...interaction} />
          <StateNode
            y={RESIDUAL_STATE_Y}
            title="Residual 1"
            formulaId="residual-1"
            state="residual-1-output"
          />
          <ModuleNode
            id="layer-norm-2"
            className="architecture-block-normalization"
            y={LN2_Y}
            height={LN_HEIGHT}
            {...interaction}
          />
          <ModuleNode
            id="mlp"
            className="architecture-block-mlp"
            y={MLP_Y}
            height={MLP_HEIGHT}
            {...interaction}
          />
          <AddNode id="residual-2" y={ADD2_Y} {...interaction} />
          <StateNode
            y={OUTPUT_Y}
            title="Block Output"
            formulaId="residual-2"
            state="block-output"
          />
          <BlockConnectors />
          <ResidualJunctions />
        </svg>
      </section>
      <figcaption className="architecture-math-caption">
        <MathFormula formula={formulaCatalog["residual-1"]} />
        <span aria-hidden="true">·</span>
        <MathFormula formula={formulaCatalog["residual-2"]} />
      </figcaption>
    </figure>
  );
}
