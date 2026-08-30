import type { ReactElement, Ref } from "react";
import type { Group } from "three";

import { LEARNING_SCENE_COLORS } from "./scenePalette";

type VectorStripProps = Readonly<{
  color: string;
  position: readonly [number, number, number];
  values: readonly Readonly<{ id: string; value: number }>[];
}>;

type TensorGridProps = Readonly<{
  color?: string;
  cols: number;
  encoding?: "depth" | "intensity";
  position: readonly [number, number, number];
  rowLift?: number;
  rows: number;
  selectionActive?: boolean;
  selectedRow?: number;
  selectedRowRef?: Ref<Group>;
  values: readonly Readonly<{ id: string; value: number }>[];
}>;

export function VectorStrip({
  color,
  position,
  values,
}: VectorStripProps): ReactElement {
  const gap = 0.68;
  const start = -((values.length - 1) * gap) / 2;
  return (
    <group position={[...position]}>
      {values.map(({ id, value }, index) => (
        <mesh key={id} position={[start + index * gap, 0, value * 0.16]}>
          <boxGeometry args={[0.54, 0.5, 0.14 + Math.abs(value) * 0.2]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.02 + Math.abs(value) * 0.04}
            metalness={0.02}
            roughness={0.82}
          />
        </mesh>
      ))}
    </group>
  );
}

export function TensorGrid({
  color = LEARNING_SCENE_COLORS.neutral,
  cols,
  encoding = "depth",
  position,
  rowLift = 0,
  rows,
  selectionActive = true,
  selectedRow,
  selectedRowRef,
  values,
}: TensorGridProps): ReactElement {
  const gap = 0.62;
  const xStart = -((cols - 1) * gap) / 2;
  const yStart = ((rows - 1) * gap) / 2;
  return (
    <group position={[...position]}>
      {Array.from({ length: rows }, (_, row) => {
        const selected = selectionActive && row === selectedRow;
        const rowCells = values.slice(row * cols, (row + 1) * cols);
        const rowId = rowCells.map((cell) => cell.id).join("-");
        return (
          <group
            key={rowId}
            position={[0, yStart - row * gap, selected ? rowLift : 0]}
            {...(row === selectedRow && selectedRowRef !== undefined
              ? { ref: selectedRowRef }
              : {})}
          >
            {rowCells.map(({ id, value }, col) => {
              const cellColor = selected
                ? LEARNING_SCENE_COLORS.selected
                : encoding === "intensity"
                  ? value >= 0
                    ? LEARNING_SCENE_COLORS.hidden
                    : LEARNING_SCENE_COLORS.position
                  : color;
              return (
                <mesh key={id} position={[xStart + col * gap, 0, 0]}>
                  <boxGeometry
                    args={[
                      0.52,
                      0.52,
                      encoding === "depth"
                        ? 0.1 + Math.abs(value) * 0.18
                        : 0.16,
                    ]}
                  />
                  <meshStandardMaterial
                    color={cellColor}
                    emissive={cellColor}
                    emissiveIntensity={
                      selected
                        ? 0.08
                        : encoding === "intensity"
                          ? 0.02 + Math.abs(value) * 0.06
                          : 0.01
                    }
                    metalness={0.02}
                    roughness={0.84}
                    transparent
                    opacity={
                      selected
                        ? 1
                        : encoding === "intensity"
                          ? 0.62 + Math.abs(value) * 0.3
                          : 0.82
                    }
                  />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

export function FlowLine({
  color = LEARNING_SCENE_COLORS.selected,
  length = 1,
  position,
  rotation = [0, 0, -Math.PI / 2],
  scale = 1,
}: Readonly<{
  color?: string;
  length?: number;
  position: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: number;
}>): ReactElement {
  return (
    <group position={[...position]} rotation={[...rotation]} scale={scale}>
      <mesh position={[0, 0.34 * length, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.68 * length, 12]} />
        <meshStandardMaterial color={color} emissive={color} />
      </mesh>
      <mesh position={[0, -0.08, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.12, 0.24, 16]} />
        <meshStandardMaterial color={color} emissive={color} />
      </mesh>
    </group>
  );
}

export function TokenChip({
  color = LEARNING_SCENE_COLORS.token,
  position,
  scale = 1,
  selected = false,
}: Readonly<{
  color?: string;
  position: readonly [number, number, number];
  scale?: number;
  selected?: boolean;
}>): ReactElement {
  return (
    <group position={[...position]} scale={scale}>
      <mesh>
        <boxGeometry args={[1.5, 0.66, 0.18]} />
        <meshStandardMaterial
          color={color}
          emissive={selected ? LEARNING_SCENE_COLORS.selected : color}
          emissiveIntensity={selected ? 0.1 : 0.01}
          metalness={0.02}
          roughness={0.84}
        />
      </mesh>
      {selected ? (
        <mesh scale={[1.06, 1.14, 1.25]}>
          <boxGeometry args={[1.5, 0.66, 0.18]} />
          <meshBasicMaterial
            color={LEARNING_SCENE_COLORS.selected}
            transparent
            opacity={0.72}
            wireframe
          />
        </mesh>
      ) : null}
    </group>
  );
}

export function LayerPlane({
  color = LEARNING_SCENE_COLORS.stageDepth,
  opacity = 0.5,
  position,
  size,
}: Readonly<{
  color?: string;
  opacity?: number;
  position: readonly [number, number, number];
  size: readonly [number, number];
}>): ReactElement {
  return (
    <mesh position={[...position]}>
      <planeGeometry args={[...size]} />
      <meshStandardMaterial
        color={color}
        metalness={0}
        opacity={opacity}
        roughness={0.9}
        transparent
      />
    </mesh>
  );
}

export function ComputationCore({
  active,
  position,
  scale = 1,
}: Readonly<{
  active: boolean;
  position: readonly [number, number, number];
  scale?: number;
}>): ReactElement {
  return (
    <group position={[...position]} scale={scale}>
      {[-0.58, 0, 0.58].map((z, index) => (
        <mesh key={z} position={[0, 0, z]}>
          <boxGeometry args={[1.55 - index * 0.12, 1.2, 0.12]} />
          <meshStandardMaterial
            color={
              active
                ? LEARNING_SCENE_COLORS.selected
                : LEARNING_SCENE_COLORS.graphite
            }
            emissive={LEARNING_SCENE_COLORS.selected}
            emissiveIntensity={active ? 0.06 : 0}
            metalness={0.02}
            roughness={0.82}
            transparent
            opacity={0.72 + index * 0.08}
          />
        </mesh>
      ))}
    </group>
  );
}

export function SelectionFrame({
  color = LEARNING_SCENE_COLORS.selected,
  position,
  size,
}: Readonly<{
  color?: string;
  position: readonly [number, number, number];
  size: readonly [number, number, number];
}>): ReactElement {
  return (
    <mesh position={[...position]}>
      <boxGeometry args={[...size]} />
      <meshBasicMaterial color={color} transparent opacity={0.72} wireframe />
    </mesh>
  );
}
