import type { ReactElement } from "react";

import { LEARNING_SCENE_COLORS } from "./scenePalette";

type VectorRowProps = Readonly<{
  color: string;
  position: readonly [number, number, number];
  values: readonly Readonly<{ id: string; value: number }>[];
}>;

type TensorGridProps = Readonly<{
  color?: string;
  cols: number;
  position: readonly [number, number, number];
  rowLift?: number;
  rows: number;
  selectedRow?: number;
  values: readonly number[];
}>;

export function VectorRow({
  color,
  position,
  values,
}: VectorRowProps): ReactElement {
  const gap = 0.62;
  const start = -((values.length - 1) * gap) / 2;
  return (
    <group position={[...position]}>
      {values.map(({ id, value }, index) => (
        <mesh key={id} position={[start + index * gap, 0, value * 0.16]}>
          <boxGeometry args={[0.48, 0.48, 0.16 + Math.abs(value) * 0.22]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.08 + Math.abs(value) * 0.08}
            metalness={0.08}
            roughness={0.72}
          />
        </mesh>
      ))}
    </group>
  );
}

export function TensorGrid({
  color = LEARNING_SCENE_COLORS.neutral,
  cols,
  position,
  rowLift = 0,
  rows,
  selectedRow,
  values,
}: TensorGridProps): ReactElement {
  const gap = 0.56;
  const xStart = -((cols - 1) * gap) / 2;
  const yStart = ((rows - 1) * gap) / 2;
  return (
    <group position={[...position]}>
      {Array.from({ length: rows * cols }, (_, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const value = values[index % values.length] ?? 0;
        const selected = row === selectedRow;
        const cellColor = selected ? LEARNING_SCENE_COLORS.selected : color;
        return (
          <mesh
            key={`${row}-${col}`}
            position={[
              xStart + col * gap,
              yStart - row * gap,
              selected ? rowLift : 0,
            ]}
          >
            <boxGeometry args={[0.46, 0.46, 0.12 + Math.abs(value) * 0.2]} />
            <meshStandardMaterial
              color={cellColor}
              emissive={cellColor}
              emissiveIntensity={selected ? 0.24 : 0.04}
              metalness={0.06}
              roughness={0.76}
              transparent
              opacity={selected ? 1 : 0.82}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function SceneArrow({
  color = LEARNING_SCENE_COLORS.selected,
  position,
  rotation = [0, 0, -Math.PI / 2],
  scale = 1,
}: Readonly<{
  color?: string;
  position: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: number;
}>): ReactElement {
  return (
    <group position={[...position]} rotation={[...rotation]} scale={scale}>
      <mesh position={[0, 0.34, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.68, 12]} />
        <meshStandardMaterial color={color} emissive={color} />
      </mesh>
      <mesh position={[0, -0.08, 0]}>
        <coneGeometry args={[0.12, 0.24, 16]} />
        <meshStandardMaterial color={color} emissive={color} />
      </mesh>
    </group>
  );
}
