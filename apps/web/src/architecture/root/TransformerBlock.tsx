import { repeatedBlockLabel } from "../../domain/notation";
import { ArchitectureNode } from "../ArchitectureNode";
import type { ArchitectureNodeId } from "../catalog";
import { BLOCK } from "./layout";

interface TransformerBlockProps {
  readonly layerCount: number;
  readonly selected: boolean;
  readonly highlighted?: boolean;
  readonly interactive?: boolean;
  readonly onActivate: (id: ArchitectureNodeId) => void;
}

export function TransformerBlock({
  layerCount,
  selected,
  highlighted = false,
  interactive = true,
  onActivate,
}: TransformerBlockProps) {
  return (
    <ArchitectureNode
      id="transformer-block"
      bounds={{ ...BLOCK, radius: 10 }}
      selected={selected}
      highlighted={highlighted}
      interactive={interactive}
      onActivate={onActivate}
      {...(interactive
        ? { drillDownIndicator: { label: "자세히 보기 →" } }
        : {})}
    >
      <g
        className={`architecture-block-group architecture-interactive-node architecture-interactive-node--drill-down${selected ? " is-selected" : ""}`}
        aria-label={`Transformer Block repeated ${layerCount} times`}
      >
        <rect className="architecture-block-frame" {...BLOCK} rx={10} />
        <text
          className="architecture-block-title"
          x={BLOCK.x + 24}
          y={BLOCK.y + 38}
        >
          {repeatedBlockLabel(layerCount)}
        </text>
        <g className="architecture-block-summary">
          <text x={BLOCK.x + 24} y={BLOCK.y + 88}>
            LN → Attention → Residual
          </text>
          <line
            className="architecture-block-summary__divider"
            x1={BLOCK.x + 24}
            y1={BLOCK.y + 112}
            x2={BLOCK.x + BLOCK.width - 24}
            y2={BLOCK.y + 112}
          />
          <text x={BLOCK.x + 24} y={BLOCK.y + 151}>
            LN → MLP → Residual
          </text>
        </g>
      </g>
    </ArchitectureNode>
  );
}
