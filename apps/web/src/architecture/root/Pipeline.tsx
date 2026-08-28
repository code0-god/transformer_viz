import type { ArchitectureNodeId } from "../catalog";
import {
  BLOCK,
  CENTER_X,
  type DiagramLayout,
  EMBEDDING_ADD,
  EMBEDDING_BRANCH_Y,
  EMBEDDINGS,
  HIDDEN,
  INPUT,
} from "./layout";
import { OutputPath } from "./OutputPath";
import { StageNode } from "./StageNode";
import { TransformerBlock } from "./TransformerBlock";

interface PipelineProps {
  readonly layerCount: number;
  readonly layout: DiagramLayout;
  readonly selectedNodeId: ArchitectureNodeId | null;
  readonly highlightedNodeIds: readonly ArchitectureNodeId[];
  readonly interactive: boolean;
  readonly onActivate: (id: ArchitectureNodeId) => void;
}

function InputPath({
  selectedNodeId,
  highlightedNodeIds,
  interactive,
  onActivate,
}: Pick<
  PipelineProps,
  "selectedNodeId" | "highlightedNodeIds" | "interactive" | "onActivate"
>) {
  const [token, position] = EMBEDDINGS;
  return (
    <>
      <StageNode
        id="input-context"
        className="architecture-node-input"
        bounds={INPUT}
        selected={selectedNodeId === "input-context"}
        highlighted={highlightedNodeIds.includes("input-context")}
        interactive={interactive}
        onActivate={onActivate}
      />
      <StageNode
        id="token-embedding"
        className="architecture-node-embedding"
        bounds={token}
        selected={selectedNodeId === "token-embedding"}
        highlighted={highlightedNodeIds.includes("token-embedding")}
        interactive={interactive}
        onActivate={onActivate}
      />
      <StageNode
        id="position-embedding"
        className="architecture-node-embedding"
        bounds={position}
        selected={selectedNodeId === "position-embedding"}
        highlighted={highlightedNodeIds.includes("position-embedding")}
        interactive={interactive}
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
        className={`architecture-add${highlightedNodeIds.includes("embedding-add") ? " is-learning-highlighted" : ""}`}
        data-learning-highlighted={
          highlightedNodeIds.includes("embedding-add") ? "true" : undefined
        }
        cx={EMBEDDING_ADD.x}
        cy={EMBEDDING_ADD.y}
        r={EMBEDDING_ADD.radius}
      />
      <StageNode
        id="hidden-state"
        className="architecture-node-hidden"
        bounds={HIDDEN}
        selected={false}
        highlighted={highlightedNodeIds.includes("hidden-state")}
        interactive={interactive}
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

function BlockPath({
  layerCount,
  selectedNodeId,
  highlightedNodeIds,
  interactive,
  onActivate,
}: PipelineProps) {
  return (
    <>
      <TransformerBlock
        layerCount={layerCount}
        selected={selectedNodeId === "transformer-block"}
        highlighted={highlightedNodeIds.includes("transformer-block")}
        interactive={interactive}
        onActivate={onActivate}
      />
      <line
        className="architecture-flow"
        data-connector="hidden-to-block"
        x1={CENTER_X}
        y1={HIDDEN.y + HIDDEN.height}
        x2={CENTER_X}
        y2={BLOCK.y}
      />
    </>
  );
}

export function Pipeline(props: PipelineProps) {
  return (
    <>
      <InputPath
        selectedNodeId={props.selectedNodeId}
        highlightedNodeIds={props.highlightedNodeIds}
        interactive={props.interactive}
        onActivate={props.onActivate}
      />
      <BlockPath {...props} />
      <OutputPath {...props} />
    </>
  );
}
