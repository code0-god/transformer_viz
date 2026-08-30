import type { ReactElement } from "react";
import { useCallback, useRef } from "react";
import type { Group } from "three";

import { LEARNING_SCENE_COLORS } from "../scenePalette";
import { useDemandTransition } from "../useDemandTransition";

function segmentEntries(
  segments: readonly string[],
): readonly Readonly<{ id: string; label: string; width: number }>[] {
  const seen = new Map<string, number>();
  const raw = segments.map((segment) => {
    const occurrence = seen.get(segment) ?? 0;
    seen.set(segment, occurrence + 1);
    return {
      id: `${segment}-${occurrence}`,
      label: segment,
      width: Math.min(1.55, Math.max(0.62, 0.46 + segment.length * 0.14)),
    };
  });
  const total = raw.reduce((sum, entry) => sum + entry.width, 0);
  const scale = total > 7.2 ? 7.2 / total : total < 5.4 ? 5.4 / total : 1;
  return raw.map((entry) => ({ ...entry, width: entry.width * scale }));
}

export function SegmentationStrip({
  color = LEARNING_SCENE_COLORS.token,
  mobile,
  onFrame,
  reducedMotion,
  segments,
  split,
  transitionKey,
}: Readonly<{
  color?: string;
  mobile: boolean;
  onFrame: () => void;
  reducedMotion: boolean;
  segments: readonly string[];
  split: boolean;
  transitionKey: string | number;
}>): ReactElement {
  const entries = segmentEntries(segments);
  const widths = entries.map(({ width }) => width);
  const groups = useRef<(Group | null)[]>([]);
  const apply = useCallback(
    (progress: number) => {
      const fullGap = mobile ? 0.14 : 0.22;
      const gap = split ? fullGap * progress : fullGap * (1 - progress);
      const total =
        widths.reduce((sum, width) => sum + width, 0) +
        gap * Math.max(0, widths.length - 1);
      let cursor = -total / 2;
      groups.current.forEach((group, index) => {
        const width = widths[index] ?? 0.7;
        if (group !== null) {
          group.position.x = cursor + width / 2;
          group.position.z =
            gap === 0 ? 0 : (index % 2 === 0 ? 0.08 : -0.08) * progress;
        }
        cursor += width + gap;
      });
    },
    [mobile, split, widths],
  );
  useDemandTransition({
    apply,
    duration: 0.48,
    onFrame,
    reducedMotion,
    transitionKey,
  });

  return (
    <group>
      {entries.map((entry, index) => {
        return (
          <group
            key={entry.id}
            ref={(group) => {
              groups.current[index] = group;
            }}
          >
            <mesh>
              <boxGeometry args={[entry.width, 0.82, 0.16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={split ? 0.04 : 0.01}
                metalness={0.01}
                roughness={0.86}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function ComputationCore({
  active,
  position,
}: Readonly<{
  active: boolean;
  position: readonly [number, number, number];
}>): ReactElement {
  return (
    <group position={[...position]}>
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
