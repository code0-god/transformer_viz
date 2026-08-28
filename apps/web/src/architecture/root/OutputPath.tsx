import type { ArchitectureNodeId } from "../catalog";
import {
  BLOCK,
  CENTER_X,
  type DiagramLayout,
  INPUT,
  OUTPUT_STAGES,
} from "./layout";
import { StageNode } from "./StageNode";

interface OutputPathProps {
  readonly layout: DiagramLayout;
  readonly selectedNodeId: ArchitectureNodeId | null;
  readonly highlightedNodeIds: readonly ArchitectureNodeId[];
  readonly interactive: boolean;
  readonly onActivate: (id: ArchitectureNodeId) => void;
}

const OUTPUT_IDS: readonly [
  ArchitectureNodeId,
  ArchitectureNodeId,
  ArchitectureNodeId,
  ArchitectureNodeId,
  ArchitectureNodeId,
  ArchitectureNodeId,
] = [
  "final-layer-norm",
  "lm-head",
  "logits",
  "token-selection",
  "generated-token",
  "append-context",
];
const OUTPUT_CLASSES: readonly [
  string,
  string,
  string,
  string,
  string,
  string,
] = [
  "architecture-node-normalization",
  "architecture-node-projection",
  "architecture-node-logits",
  "architecture-node-sampling",
  "architecture-node-token",
  "architecture-node-append",
];
const CONNECTOR_NAMES: readonly [
  string,
  string,
  string,
  string,
  string,
  string,
] = [
  "block-to-final",
  "final-to-lm-head",
  "lm-head-to-logits",
  "logits-to-selection",
  "selection-to-generated",
  "generated-to-append",
];

export function OutputPath({
  layout,
  selectedNodeId,
  highlightedNodeIds,
  interactive,
  onActivate,
}: OutputPathProps) {
  const starts = [
    BLOCK.y + BLOCK.height,
    ...OUTPUT_STAGES.map((stage) => stage.y + stage.height),
  ];
  return (
    <>
      {OUTPUT_STAGES.map((bounds, index) => {
        const id = OUTPUT_IDS[index];
        const className = OUTPUT_CLASSES[index];
        return id === undefined || className === undefined ? null : (
          <StageNode
            key={id}
            id={id}
            className={className}
            bounds={bounds}
            selected={selectedNodeId === id}
            highlighted={highlightedNodeIds.includes(id)}
            interactive={interactive}
            onActivate={onActivate}
          />
        );
      })}
      {OUTPUT_STAGES.map((stage, index) => {
        const y1 = starts[index];
        const name = CONNECTOR_NAMES[index];
        return y1 === undefined || name === undefined ? null : (
          <line
            key={name}
            className="architecture-flow"
            data-connector={name}
            x1={CENTER_X}
            y1={y1}
            x2={CENTER_X}
            y2={stage.y}
          />
        );
      })}
      <path
        className="architecture-repeat"
        d={`M ${OUTPUT_STAGES[5].x} ${layout.appendY + 27} H 80 V ${INPUT.y + INPUT.height / 2} H ${INPUT.x}`}
      />
      <text
        className="architecture-repeat-label"
        x={98}
        y={layout.selectionY + 28}
      >
        CONTEXT UPDATE
      </text>
      <text
        className="architecture-repeat-subtitle"
        x={98}
        y={layout.selectionY + 48}
      >
        Updated context
      </text>
    </>
  );
}
