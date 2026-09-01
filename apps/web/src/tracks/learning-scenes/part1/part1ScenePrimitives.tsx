import type { ReactElement } from "react";

import { LEARNING_SCENE_COLORS } from "../scenePalette";
import { TokenChip } from "../scenePrimitives";

export function ContextRibbon({
  color = LEARNING_SCENE_COLORS.token,
  position,
  selected = false,
  tokens,
}: Readonly<{
  color?: string;
  position: readonly [number, number, number];
  selected?: boolean;
  tokens: readonly string[];
}>): ReactElement {
  const gap = 0.9;
  const start = -((tokens.length - 1) * gap) / 2;
  const seen = new Map<string, number>();
  const items = tokens.map((token) => {
    const occurrence = seen.get(token) ?? 0;
    seen.set(token, occurrence + 1);
    return { id: `${token}-${occurrence}`, token };
  });
  return (
    <group position={[...position]}>
      {items.map((item, index) => (
        <TokenChip
          key={item.id}
          color={color}
          position={[start + index * gap, 0, 0]}
          scale={0.54}
          selected={selected && index === tokens.length - 1}
        />
      ))}
    </group>
  );
}
