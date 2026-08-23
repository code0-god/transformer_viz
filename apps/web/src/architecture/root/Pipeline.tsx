import type { ArchitectureNodeId } from "../catalog";
import {
  BLOCK,
  BLOCK_MODULES,
  CENTER_X,
  type DiagramLayout,
  EMBEDDING_ADD,
  EMBEDDING_BRANCH_Y,
  EMBEDDINGS,
  HIDDEN,
  INPUT,
  RESIDUAL_JUNCTIONS,
} from "./layout";
import { OutputPath } from "./OutputPath";
import { StageNode } from "./StageNode";
import { TransformerBlock } from "./TransformerBlock";

interface PipelineProps {
  readonly layerCount: number;
  readonly layout: DiagramLayout;
  readonly selectedNodeId: ArchitectureNodeId | null;
  readonly onActivate: (id: ArchitectureNodeId) => void;
}

function InputPath({
  selectedNodeId,
  onActivate,
}: Pick<PipelineProps, "selectedNodeId" | "onActivate">) {
  const [token, position] = EMBEDDINGS;
  return (
    <>
      <StageNode
        id="input-context"
        className="architecture-node-input"
        bounds={INPUT}
        selected={selectedNodeId === "input-context"}
        onActivate={onActivate}
      />
      <StageNode
        id="token-embedding"
        className="architecture-node-embedding"
        bounds={token}
        selected={selectedNodeId === "token-embedding"}
        onActivate={onActivate}
      />
      <StageNode
        id="position-embedding"
        className="architecture-node-embedding"
        bounds={position}
        selected={selectedNodeId === "position-embedding"}
        onActivate={onActivate}
      />
      <path
        className="architecture-flow"
        data-connector="input-to-token"
        d={`M ${CENTER_X} ${INPUT.y + INPUT.height} V ${EMBEDDING_BRANCH_Y} H ${token.x + token.width / 2} V ${token.y}`}
      />
      <path
        className="architecture-flow"
        data-connector="input-to-position"
        d={`M ${CENTER_X} ${INPUT.y + INPUT.height} V ${EMBEDDING_BRANCH_Y} H ${position.x + position.width / 2} V ${position.y}`}
      />
      <circle
        className="architecture-add"
        cx={EMBEDDING_ADD.x}
        cy={EMBEDDING_ADD.y}
        r={EMBEDDING_ADD.radius}
      />
      <StageNode
        id="hidden-state"
        className="architecture-node-hidden"
        bounds={HIDDEN}
        selected={false}
        onActivate={onActivate}
      />
      <path
        className="architecture-merge"
        data-connector="token-to-embedding-add"
        d={`M ${token.x + token.width / 2} ${token.y + token.height} V ${EMBEDDING_ADD.y} H ${EMBEDDING_ADD.x - EMBEDDING_ADD.radius}`}
      />
      <path
        className="architecture-merge"
        data-connector="position-to-embedding-add"
        d={`M ${position.x + position.width / 2} ${position.y + position.height} V ${EMBEDDING_ADD.y} H ${EMBEDDING_ADD.x + EMBEDDING_ADD.radius}`}
      />
      <line
        className="architecture-flow"
        data-connector="embedding-add-to-hidden"
        x1={CENTER_X}
        y1={EMBEDDING_ADD.y + EMBEDDING_ADD.radius}
        x2={CENTER_X}
        y2={HIDDEN.y}
      />
      <text
        className="architecture-add-label"
        x={CENTER_X}
        y={EMBEDDING_ADD.y + 6}
        textAnchor="middle"
      >
        +
      </text>
    </>
  );
}

function BlockPath({ layerCount, selectedNodeId, onActivate }: PipelineProps) {
  return (
    <>
      <TransformerBlock
        layerCount={layerCount}
        selected={selectedNodeId === "transformer-block"}
        onActivate={onActivate}
      />
      <line
        className="architecture-flow"
        data-connector="hidden-to-ln1"
        x1={CENTER_X}
        y1={HIDDEN.y + HIDDEN.height}
        x2={CENTER_X}
        y2={BLOCK_MODULES[0].y}
      />
      {RESIDUAL_JUNCTIONS.map((junction) => (
        <circle
          key={junction.y}
          className="architecture-residual-junction"
          cx={junction.x}
          cy={junction.y}
          r={5}
        />
      ))}
      <line
        className="architecture-forward-guide"
        x1={790}
        y1={BLOCK.y}
        x2={790}
        y2={BLOCK.y + BLOCK.height}
      />
      <text className="architecture-forward-label" x={812} y={570}>
        FULL FORWARD
      </text>
      <text className="architecture-forward-subtitle" x={812} y={588}>
        top-to-bottom pass
      </text>
    </>
  );
}

export function Pipeline(props: PipelineProps) {
  return (
    <>
      <InputPath
        selectedNodeId={props.selectedNodeId}
        onActivate={props.onActivate}
      />
      <BlockPath {...props} />
      <OutputPath {...props} />
    </>
  );
}
