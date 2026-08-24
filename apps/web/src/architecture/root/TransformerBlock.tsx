import { notationCatalog, repeatedBlockLabel } from "../../domain/notation";
import { ArchitectureNode } from "../ArchitectureNode";
import type { ArchitectureNodeId } from "../catalog";
import {
  BLOCK,
  BLOCK_MODULES,
  CENTER_X,
  RESIDUAL_ADDS,
  RESIDUAL_JUNCTIONS,
  RESIDUAL_RAIL_X,
} from "./layout";

interface TransformerBlockProps {
  readonly layerCount: number;
  readonly selected: boolean;
  readonly highlighted?: boolean;
  readonly onActivate: (id: ArchitectureNodeId) => void;
}

const MODULES: readonly [
  Readonly<{ id: ArchitectureNodeId; className: string }>,
  Readonly<{ id: ArchitectureNodeId; className: string }>,
  Readonly<{ id: ArchitectureNodeId; className: string }>,
  Readonly<{ id: ArchitectureNodeId; className: string }>,
] = [
  { id: "layer-norm-1", className: "architecture-block-normalization" },
  { id: "self-attention", className: "architecture-block-attention" },
  { id: "layer-norm-2", className: "architecture-block-normalization" },
  { id: "mlp", className: "architecture-block-mlp" },
];

function BlockModule({ index }: Readonly<{ index: 0 | 1 | 2 | 3 }>) {
  const definition = MODULES[index];
  const bounds = BLOCK_MODULES[index];
  return (
    <g className={`architecture-block-module ${definition.className}`}>
      <rect {...bounds} rx={8} />
      <text
        x={CENTER_X}
        y={bounds.y + bounds.height / 2 + 6}
        textAnchor="middle"
      >
        {notationCatalog[definition.id].title}
      </text>
    </g>
  );
}

function ResidualAdd({ index }: Readonly<{ index: 0 | 1 }>) {
  const add = RESIDUAL_ADDS[index];
  return (
    <>
      <circle
        className="architecture-residual-add"
        cx={add.x}
        cy={add.y}
        r={add.radius}
      />
      <text
        className="architecture-add-label"
        x={add.x}
        y={add.y + 6}
        textAnchor="middle"
      >
        +
      </text>
    </>
  );
}

export function TransformerBlock({
  layerCount,
  selected,
  highlighted = false,
  onActivate,
}: TransformerBlockProps) {
  const [ln1, attention, ln2, mlp] = BLOCK_MODULES;
  const [add1, add2] = RESIDUAL_ADDS;
  const [junction1, junction2] = RESIDUAL_JUNCTIONS;
  return (
    <ArchitectureNode
      id="transformer-block"
      bounds={{ ...BLOCK, radius: 16 }}
      selected={selected}
      highlighted={highlighted}
      onActivate={onActivate}
      drillDownIndicator={{
        label: "자세히 보기 ›",
      }}
    >
      <g
        className={`architecture-block-group architecture-interactive-node architecture-interactive-node--drill-down${selected ? " is-selected" : ""}`}
        aria-label={`Transformer Block repeated ${layerCount} times`}
      >
        <rect className="architecture-block-frame" {...BLOCK} rx={16} />
        <text className="architecture-block-title" x={BLOCK.x + 22} y={374}>
          {repeatedBlockLabel(layerCount)}
        </text>
        <BlockModule index={0} />
        <BlockModule index={1} />
        <ResidualAdd index={0} />
        <BlockModule index={2} />
        <BlockModule index={3} />
        <ResidualAdd index={1} />
        <line
          className="architecture-flow"
          data-connector="ln1-to-attention"
          x1={CENTER_X}
          y1={ln1.y + ln1.height}
          x2={CENTER_X}
          y2={attention.y}
        />
        <line
          className="architecture-flow"
          data-connector="attention-to-add1"
          x1={CENTER_X}
          y1={attention.y + attention.height}
          x2={CENTER_X}
          y2={add1.y - add1.radius}
        />
        <path
          className="architecture-residual"
          data-connector="block-input-to-add1"
          d={`M ${CENTER_X} ${junction1.y} H ${RESIDUAL_RAIL_X} V ${add1.y} H ${CENTER_X + add1.radius}`}
        />
        <line
          className="architecture-flow"
          data-connector="add1-to-ln2"
          x1={CENTER_X}
          y1={add1.y + add1.radius}
          x2={CENTER_X}
          y2={ln2.y}
        />
        <line
          className="architecture-flow"
          data-connector="ln2-to-mlp"
          x1={CENTER_X}
          y1={ln2.y + ln2.height}
          x2={CENTER_X}
          y2={mlp.y}
        />
        <line
          className="architecture-flow"
          data-connector="mlp-to-add2"
          x1={CENTER_X}
          y1={mlp.y + mlp.height}
          x2={CENTER_X}
          y2={add2.y - add2.radius}
        />
        <path
          className="architecture-residual"
          data-connector="add1-output-to-add2"
          d={`M ${CENTER_X} ${junction2.y} H ${RESIDUAL_RAIL_X} V ${add2.y} H ${CENTER_X + add2.radius}`}
        />
      </g>
    </ArchitectureNode>
  );
}
