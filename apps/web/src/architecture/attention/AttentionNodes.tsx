import { notationCatalog } from "../../domain/notation";
import { ArchitectureNode, type NodeBounds } from "../ArchitectureNode";
import type { ArchitectureNodeId } from "../catalog";

export interface OperationNodeProps {
  readonly id: ArchitectureNodeId;
  readonly className: string;
  readonly bounds: Omit<NodeBounds, "radius">;
  readonly selectedNodeId: ArchitectureNodeId | null;
  readonly onSelectNode: (id: ArchitectureNodeId) => void;
}

export function OperationNode({
  id,
  className,
  bounds,
  selectedNodeId,
  onSelectNode,
}: OperationNodeProps) {
  const notation = notationCatalog[id];
  const centerX = bounds.x + bounds.width / 2;
  return (
    <ArchitectureNode
      id={id}
      bounds={{ ...bounds, radius: 10 }}
      selected={selectedNodeId === id}
      onActivate={onSelectNode}
    >
      <g className={`architecture-attention-operation ${className}`}>
        <rect {...bounds} rx={10} />
        <text
          x={centerX}
          y={bounds.y + bounds.height / 2 - 3}
          textAnchor="middle"
        >
          {notation.title}
        </text>
        <text
          className="architecture-node-subtitle"
          x={centerX}
          y={bounds.y + bounds.height / 2 + 18}
          textAnchor="middle"
        >
          {notation.diagramDetail}
        </text>
      </g>
    </ArchitectureNode>
  );
}

export function SplitHeadsNode({
  bounds,
}: {
  readonly bounds: Omit<NodeBounds, "radius">;
}) {
  const centerX = bounds.x + bounds.width / 2;
  return (
    <g className="architecture-attention-split">
      <rect {...bounds} rx={10} />
      <text x={centerX} y={bounds.y + 28} textAnchor="middle">
        Split Heads
      </text>
      <text
        className="architecture-node-subtitle"
        x={centerX}
        y={bounds.y + 50}
        textAnchor="middle"
      >
        [T, C] → [H, T, D]
      </text>
    </g>
  );
}

export function StateNode({
  bounds,
  title,
  subtitle,
}: {
  readonly bounds: Omit<NodeBounds, "radius">;
  readonly title: string;
  readonly subtitle: string;
}) {
  const centerX = bounds.x + bounds.width / 2;
  return (
    <g className="architecture-attention-state">
      <rect {...bounds} rx={10} />
      <text
        x={centerX}
        y={bounds.y + bounds.height / 2 - 3}
        textAnchor="middle"
      >
        {title}
      </text>
      <text
        className="architecture-node-subtitle"
        x={centerX}
        y={bounds.y + bounds.height / 2 + 18}
        textAnchor="middle"
      >
        {subtitle}
      </text>
    </g>
  );
}
