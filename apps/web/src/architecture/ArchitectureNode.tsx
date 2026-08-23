import type { KeyboardEvent, ReactNode, SVGProps } from "react";

import { type ArchitectureNodeId, architectureNodeCatalog } from "./catalog";
import "./architecture.css";

export interface NodeBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly radius: number;
}

export interface DrillDownIndicator {
  readonly x: number;
  readonly y: number;
  readonly label: string;
}

export interface ArchitectureNodeProps {
  readonly id: ArchitectureNodeId;
  readonly bounds: NodeBounds;
  readonly selected: boolean;
  readonly onActivate: (id: ArchitectureNodeId) => void;
  readonly drillDownIndicator?: DrillDownIndicator;
  readonly disabled?: boolean;
  readonly children: ReactNode;
}

export function ArchitectureNode({
  id,
  bounds,
  selected,
  onActivate,
  drillDownIndicator,
  disabled = false,
  children,
}: ArchitectureNodeProps) {
  const definition = architectureNodeCatalog[id];
  const interactive = definition.capability !== "static";
  const stateClass = selected ? " is-selected" : "";
  const disabledClass = disabled ? " is-disabled" : "";
  const suffix = disabled
    ? ", 사용할 수 없음"
    : definition.capability === "drill-down"
      ? ", 자세히 보기 가능"
      : definition.capability === "selectable"
        ? ", 선택 가능"
        : "";
  const className = `architecture-node architecture-node--${definition.capability}${stateClass}${disabledClass}`;
  const content = (
    <>
      {children}
      <rect
        className="architecture-node__focus-outline"
        fill="none"
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        rx={bounds.radius}
      />
      {drillDownIndicator === undefined ? null : (
        <text
          className="architecture-node__drill-down"
          x={drillDownIndicator.x}
          y={drillDownIndicator.y}
          textAnchor="end"
        >
          {drillDownIndicator.label}
        </text>
      )}
    </>
  );

  if (!interactive) {
    return (
      <g
        className={className}
        data-node-id={id}
        data-node-capability="static"
        aria-label={definition.accessibleName}
      >
        {content}
      </g>
    );
  }

  function activate(): void {
    if (!disabled) onActivate(id);
  }

  function handleKeyDown(event: KeyboardEvent<SVGGElement>): void {
    if (!disabled && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onActivate(id);
    }
  }

  const interactionProps: SVGProps<SVGGElement> = {
    role: "button",
    tabIndex: disabled ? undefined : 0,
    "aria-label": `${definition.accessibleName}${suffix}`,
    "aria-pressed": selected,
    "aria-disabled": disabled || undefined,
    onClick: activate,
    onKeyDown: handleKeyDown,
  };

  return (
    <g
      className={className}
      data-node-id={id}
      data-node-capability={definition.capability}
      data-selected={selected ? "true" : undefined}
      {...interactionProps}
    >
      {content}
    </g>
  );
}
