import type { ReactElement } from "react";
import { useCallback, useMemo, useRef } from "react";
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
  narrative = false,
  onFrame,
  reducedMotion,
  segments,
  split,
  transitionKey,
}: Readonly<{
  color?: string;
  mobile: boolean;
  narrative?: boolean;
  onFrame: () => void;
  reducedMotion: boolean;
  segments: readonly string[];
  split: boolean;
  transitionKey: string | number;
}>): ReactElement {
  const entries = useMemo(() => segmentEntries(segments), [segments]);
  const widths = useMemo(() => entries.map(({ width }) => width), [entries]);
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
              <boxGeometry
                args={[
                  entry.width,
                  narrative ? 0.46 : 0.82,
                  narrative ? 0.09 : 0.16,
                ]}
              />
              <meshStandardMaterial
                color={
                  narrative && !split ? LEARNING_SCENE_COLORS.stageDepth : color
                }
                emissive={color}
                emissiveIntensity={split ? 0.03 : 0}
                metalness={0.01}
                opacity={narrative && !split ? 0.14 : 0.82}
                roughness={0.86}
                transparent={narrative}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
