import { notationCatalog } from "../../domain/notation";
import { ArchitectureNode, ArchitectureNodeFormula } from "../ArchitectureNode";
import { type ArchitectureNodeId, architectureNodeCatalog } from "../catalog";
import type { RectBounds } from "./layout";

export interface StageNodeProps {
  readonly id: ArchitectureNodeId;
  readonly className: string;
  readonly bounds: RectBounds;
  readonly selected: boolean;
  readonly highlighted?: boolean;
  readonly interactive?: boolean;
  readonly onActivate: (id: ArchitectureNodeId) => void;
}

export function StageNode({
  id,
  className,
  bounds,
  selected,
  highlighted = false,
  interactive = true,
  onActivate,
}: StageNodeProps) {
  const notation = notationCatalog[id];
  const capability = architectureNodeCatalog[id].capability;
  const singleLine = notation.diagramDetail.length === 0;
  const titleY = singleLine
    ? bounds.y + bounds.height / 2 + 2
    : bounds.y + (bounds.height > 42 ? 22 : 17);
  const subtitleY = bounds.y + (bounds.height > 42 ? 41 : 32);

  return (
    <ArchitectureNode
      id={id}
      bounds={{ ...bounds, radius: 6 }}
      selected={selected}
      highlighted={highlighted}
      interactive={interactive}
      onActivate={onActivate}
    >
      <g
        className={`architecture-node ${className}${interactive ? ` architecture-interactive-node architecture-interactive-node--${capability}` : ""}${selected ? " is-selected" : ""}`}
      >
        <rect {...bounds} rx={6} />
        <text
          x={bounds.x + bounds.width / 2}
          y={titleY}
          textAnchor="middle"
          dominantBaseline={singleLine ? "middle" : "auto"}
        >
          {notation.title}
        </text>
        <ArchitectureNodeFormula
          formulaId={id}
          x={bounds.x + 8}
          y={subtitleY - 12}
          width={bounds.width - 16}
        />
      </g>
    </ArchitectureNode>
  );
}
