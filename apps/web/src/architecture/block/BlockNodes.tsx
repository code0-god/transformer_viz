import { notationCatalog } from "../../domain/notation";
import type { FormulaId } from "../../math/formulaCatalog";
import { ArchitectureNode, ArchitectureNodeFormula } from "../ArchitectureNode";
import type { ArchitectureNodeId } from "../catalog";
import {
  ADD_RADIUS,
  CENTER_X,
  MODULE_WIDTH,
  MODULE_X,
  STATE_HEIGHT,
} from "./blockGeometry";

interface NodeInteraction {
  readonly selectedNodeId: ArchitectureNodeId | null;
  readonly onActivateNode: (id: ArchitectureNodeId) => void;
}

interface ModuleNodeProps extends NodeInteraction {
  readonly id: "layer-norm-1" | "self-attention" | "layer-norm-2" | "mlp";
  readonly className: string;
  readonly y: number;
  readonly height: number;
}

export function ModuleNode({
  id,
  className,
  y,
  height,
  selectedNodeId,
  onActivateNode,
}: ModuleNodeProps) {
  const notation = notationCatalog[id];
  return (
    <ArchitectureNode
      id={id}
      bounds={{
        x: MODULE_X,
        y,
        width: MODULE_WIDTH,
        height,
        radius: 10,
      }}
      selected={selectedNodeId === id}
      onActivate={onActivateNode}
      {...(id === "self-attention"
        ? {
            drillDownIndicator: {
              label: "자세히 보기 ›",
            },
          }
        : {})}
    >
      <g className={`architecture-block-module ${className}`}>
        <rect x={MODULE_X} y={y} width={MODULE_WIDTH} height={height} rx="10" />
        <text x={CENTER_X} y={y + height / 2 - 3} textAnchor="middle">
          {notation.title}
        </text>
        <ArchitectureNodeFormula
          formulaId={id}
          x={MODULE_X + 10}
          y={y + height / 2 + 6}
          width={MODULE_WIDTH - 20}
        />
      </g>
    </ArchitectureNode>
  );
}

interface AddNodeProps extends NodeInteraction {
  readonly id: "residual-1" | "residual-2";
  readonly y: number;
}

export function AddNode({
  id,
  y,
  selectedNodeId,
  onActivateNode,
}: AddNodeProps) {
  return (
    <ArchitectureNode
      id={id}
      bounds={{
        x: CENTER_X - ADD_RADIUS,
        y: y - ADD_RADIUS,
        width: ADD_RADIUS * 2,
        height: ADD_RADIUS * 2,
        radius: ADD_RADIUS,
      }}
      selected={selectedNodeId === id}
      onActivate={onActivateNode}
    >
      <circle
        className="architecture-residual-add"
        cx={CENTER_X}
        cy={y}
        r={ADD_RADIUS}
      />
      <text
        className="architecture-add-label"
        x={CENTER_X}
        y={y + 6}
        textAnchor="middle"
      >
        +
      </text>
    </ArchitectureNode>
  );
}

interface StateNodeProps {
  readonly y: number;
  readonly title: string;
  readonly formulaId: FormulaId;
  readonly state: string;
}

export function StateNode({ y, title, formulaId, state }: StateNodeProps) {
  return (
    <g className="architecture-detail-state" data-state-node={state}>
      <rect
        x={MODULE_X}
        y={y}
        width={MODULE_WIDTH}
        height={STATE_HEIGHT}
        rx="10"
      />
      <text x={CENTER_X} y={y + 20} textAnchor="middle">
        {title}
      </text>
      <ArchitectureNodeFormula
        formulaId={formulaId}
        x={MODULE_X + 10}
        y={y + 27}
        width={MODULE_WIDTH - 20}
      />
    </g>
  );
}
