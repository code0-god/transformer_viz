import type { KeyboardEvent, ReactNode, SVGProps } from "react";

import { type FormulaId, formulaCatalog } from "../math/formulaCatalog";
import { MathFormula } from "../math/MathFormula";
import { useArchitectureNodeRegistration } from "./ArchitectureLearningContext";
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
  readonly label: string;
}

export interface ArchitectureNodeProps {
  readonly id: ArchitectureNodeId;
  readonly bounds: NodeBounds;
  readonly selected: boolean;
  readonly highlighted?: boolean;
  readonly onActivate: (id: ArchitectureNodeId) => void;
  readonly drillDownIndicator?: DrillDownIndicator;
  readonly disabled?: boolean;
  readonly interactive?: boolean;
  readonly children: ReactNode;
}

export interface ArchitectureNodeFormulaProps {
  readonly formulaId: FormulaId;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height?: number;
}

interface ArchitectureSvgFormulaProps extends ArchitectureNodeFormulaProps {
  readonly surfaceClassName: string;
  readonly slotClassName?: string;
}

function ArchitectureSvgFormula({
  formulaId,
  x,
  y,
  width,
  height = 18,
  surfaceClassName,
  slotClassName,
}: ArchitectureSvgFormulaProps) {
  return (
    <foreignObject
      className={`architecture-node-formula-slot${slotClassName === undefined ? "" : ` ${slotClassName}`}`}
      data-formula-id={formulaId}
      x={x}
      y={y}
      width={width}
      height={height}
    >
      <div className="architecture-node-formula-frame">
        <MathFormula
          formula={formulaCatalog[formulaId]}
          className={surfaceClassName}
        />
      </div>
    </foreignObject>
  );
}

export function ArchitectureNodeFormula(props: ArchitectureNodeFormulaProps) {
  return (
    <ArchitectureSvgFormula
      {...props}
      surfaceClassName="architecture-node-formula"
    />
  );
}

export function ArchitectureCanvasFormula({
  className,
  ...props
}: ArchitectureNodeFormulaProps & Readonly<{ className: string }>) {
  return (
    <ArchitectureSvgFormula
      {...props}
      surfaceClassName="architecture-canvas-formula"
      slotClassName={className}
    />
  );
}

export function ArchitectureNode({
  id,
  bounds,
  selected,
  highlighted = false,
  onActivate,
  drillDownIndicator,
  disabled = false,
  interactive = true,
  children,
}: ArchitectureNodeProps) {
  const registerNode = useArchitectureNodeRegistration();
  const definition = architectureNodeCatalog[id];
  const interactionEnabled = interactive && definition.capability !== "static";
  const stateClass = selected ? " is-selected" : "";
  const highlightClass = highlighted ? " is-learning-highlighted" : "";
  const disabledClass = disabled ? " is-disabled" : "";
  const suffix = disabled
    ? ", 사용할 수 없음"
    : definition.capability === "drill-down"
      ? ", 자세히 보기 가능"
      : definition.capability === "selectable"
        ? ", 선택 가능"
        : "";
  const className = `architecture-node architecture-node--${definition.capability}${stateClass}${highlightClass}${disabledClass}`;
  const targetWidth = Math.max(bounds.width, 136);
  const targetHeight = Math.max(bounds.height, 136);
  const content = (
    <>
      {children}
      <rect
        className="architecture-node__learning-highlight"
        fill="none"
        x={bounds.x - 3}
        y={bounds.y - 3}
        width={bounds.width + 6}
        height={bounds.height + 6}
        rx={bounds.radius + 3}
      />
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
        <g className="architecture-node__drill-down">
          <text
            className="architecture-node__drill-down--compact"
            x={bounds.x + bounds.width - 16}
            y={bounds.y + bounds.height - 12}
            textAnchor="end"
          >
            ›
          </text>
          <text
            className="architecture-node__drill-down--label"
            x={bounds.x + bounds.width - 16}
            y={bounds.y + bounds.height - 12}
            textAnchor="end"
          >
            {drillDownIndicator.label}
          </text>
        </g>
      )}
    </>
  );

  if (!interactionEnabled) {
    return (
      <g
        className={className}
        data-node-id={id}
        data-node-capability={definition.capability}
        data-interactive="false"
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
      ref={(element) => {
        registerNode?.(id, element);
      }}
      className={className}
      data-node-id={id}
      data-node-capability={definition.capability}
      data-selected={selected ? "true" : undefined}
      data-learning-highlighted={highlighted ? "true" : undefined}
      {...interactionProps}
    >
      <rect
        className="architecture-node__hit-target"
        fill="currentColor"
        fillOpacity={0.001}
        pointerEvents="all"
        x={bounds.x + (bounds.width - targetWidth) / 2}
        y={bounds.y + (bounds.height - targetHeight) / 2}
        width={targetWidth}
        height={targetHeight}
        rx={bounds.radius}
      />
      {content}
    </g>
  );
}
