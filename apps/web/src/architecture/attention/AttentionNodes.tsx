import { notationCatalog } from "../../domain/notation";
import type { FormulaId } from "../../math/formulaCatalog";
import {
  ArchitectureNode,
  ArchitectureNodeFormula,
  type NodeBounds,
} from "../ArchitectureNode";
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
        <ArchitectureNodeFormula
          formulaId={id}
          x={bounds.x + 10}
          y={bounds.y + bounds.height / 2 + 6}
          width={bounds.width - 20}
        />
      </g>
    </ArchitectureNode>
  );
}

export function SplitHeadsNode({
  bounds,
  formulaId,
}: {
  readonly bounds: Omit<NodeBounds, "radius">;
  readonly formulaId:
    | "attention-query-heads"
    | "attention-key-heads"
    | "attention-value-heads";
}) {
  const centerX = bounds.x + bounds.width / 2;
  return (
    <g className="architecture-attention-split">
      <rect {...bounds} rx={10} />
      <text x={centerX} y={bounds.y + 28} textAnchor="middle">
        Split Heads
      </text>
      <ArchitectureNodeFormula
        formulaId={formulaId}
        x={bounds.x + 8}
        y={bounds.y + 38}
        width={bounds.width - 16}
      />
    </g>
  );
}

export function StateNode({
  bounds,
  title,
  formulaId,
}: {
  readonly bounds: Omit<NodeBounds, "radius">;
  readonly title: string;
  readonly formulaId: FormulaId;
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
      <ArchitectureNodeFormula
        formulaId={formulaId}
        x={bounds.x + 10}
        y={bounds.y + bounds.height / 2 + 6}
        width={bounds.width - 20}
      />
    </g>
  );
}
