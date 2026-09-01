import { useCallback, useRef } from "react";
import type { Group } from "three";

import { LearningSceneCanvas } from "../LearningSceneCanvas";
import { LEARNING_SCENE_COLORS } from "../scenePalette";
import { FlowLine, SelectionFrame } from "../scenePrimitives";
import type { LearningSceneRendererProps } from "../sceneTypes";
import { useDemandTransition } from "../useDemandTransition";
import type { TransformerBlockState } from "./TransformerBlockSceneFigure";

const BLOCK_NODES = [
  { id: "x-in", label: "X_in" },
  { id: "ln-1", label: "LN1" },
  { id: "attention", label: "Attention" },
  { id: "add-1", label: "Add1" },
  { id: "ln-2", label: "LN2" },
  { id: "mlp", label: "MLP" },
  { id: "add-2", label: "Add2" },
  { id: "x-out", label: "X_out" },
] as const;

function ResidualPath({
  from,
  mobile,
  to,
}: Readonly<{
  from: readonly [number, number, number];
  mobile: boolean;
  to: readonly [number, number, number];
}>) {
  const color = LEARNING_SCENE_COLORS.residual;
  if (mobile) {
    const laneX = 2.75;
    const centerY = (from[1] + to[1]) / 2;
    return (
      <group position={[0, 0, -0.72]}>
        <mesh position={[(from[0] + laneX) / 2, from[1], 0]}>
          <boxGeometry args={[Math.abs(laneX - from[0]), 0.055, 0.055]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh position={[laneX, centerY, 0]}>
          <boxGeometry args={[0.055, Math.abs(to[1] - from[1]), 0.055]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh position={[(laneX + to[0]) / 2, to[1], 0]}>
          <boxGeometry args={[Math.abs(laneX - to[0]), 0.055, 0.055]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <FlowLine
          color={color}
          position={[to[0] + 0.45, to[1], 0]}
          rotation={[0, 0, Math.PI / 2]}
          scale={0.7}
        />
      </group>
    );
  }
  const laneY = -1.75;
  const centerX = (from[0] + to[0]) / 2;
  return (
    <group position={[0, 0, -0.72]}>
      <mesh position={[from[0], (from[1] + laneY) / 2, 0]}>
        <boxGeometry args={[0.055, Math.abs(laneY - from[1]), 0.055]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[centerX, laneY, 0]}>
        <boxGeometry args={[Math.abs(to[0] - from[0]), 0.055, 0.055]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[to[0], (to[1] + laneY) / 2, 0]}>
        <boxGeometry args={[0.055, Math.abs(laneY - to[1]), 0.055]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <FlowLine
        color={color}
        position={[to[0], to[1] - 0.45, 0]}
        rotation={[0, 0, Math.PI]}
        scale={0.7}
      />
    </group>
  );
}

function BlockGeometry({
  mobile,
  onFrame,
  reducedMotion,
  state,
}: Readonly<{
  mobile: boolean;
  onFrame: () => void;
  reducedMotion: boolean;
  state: TransformerBlockState;
}>) {
  const groups = useRef<(Group | null)[]>([]);
  const apply = useCallback(
    (progress: number) => {
      groups.current.forEach((group, index) => {
        if (group === null) return;
        const attention = index < 4;
        const active =
          state.stage === "full" ||
          (state.stage === "attention" && attention) ||
          (state.stage === "mlp" && !attention);
        group.position.z = active ? 0.26 * progress : -0.16;
      });
    },
    [state.stage],
  );
  useDemandTransition({
    apply,
    duration: 0.5,
    onFrame,
    reducedMotion,
    transitionKey: `${state.stage}-${state.replay}`,
  });

  const positions = BLOCK_NODES.map((node, index) => ({
    ...node,
    position: mobile
      ? ([0, 4.6 - index * 1.3, 0] as const)
      : ([index * 1.42 - 4.97, 0, 0] as const),
  }));
  const links = positions.slice(0, -1).map((from, index) => ({
    from,
    id: `${from.id}-${positions[index + 1]?.id ?? "end"}`,
    to: positions[index + 1] ?? from,
  }));

  return (
    <group>
      {positions.map((node, index) => {
        const attentionHalf = index < 4;
        const selected =
          (state.stage === "attention" && attentionHalf) ||
          (state.stage === "mlp" && !attentionHalf);
        return (
          <group
            key={node.id}
            ref={(group) => {
              groups.current[index] = group;
            }}
            position={[...node.position]}
          >
            <mesh>
              <boxGeometry
                args={[
                  node.id.includes("attention") || node.id === "mlp"
                    ? 1.2
                    : 0.82,
                  0.82,
                  0.22,
                ]}
              />
              <meshStandardMaterial
                color={
                  node.id.startsWith("add")
                    ? LEARNING_SCENE_COLORS.output
                    : selected
                      ? LEARNING_SCENE_COLORS.selected
                      : LEARNING_SCENE_COLORS.neutral
                }
                emissive={LEARNING_SCENE_COLORS.selected}
                emissiveIntensity={selected ? 0.04 : 0}
                metalness={0.01}
                roughness={0.84}
              />
            </mesh>
            {selected ? (
              <SelectionFrame
                position={[0, 0, 0]}
                size={[
                  node.id.includes("attention") || node.id === "mlp"
                    ? 1.3
                    : 0.92,
                  0.92,
                  0.3,
                ]}
              />
            ) : null}
          </group>
        );
      })}
      {links.map(({ from, id, to }) => (
        <FlowLine
          key={id}
          color={LEARNING_SCENE_COLORS.graphite}
          position={[
            (from.position[0] + to.position[0]) / 2,
            (from.position[1] + to.position[1]) / 2,
            -0.1,
          ]}
          rotation={mobile ? [0, 0, 0] : [0, 0, Math.PI / 2]}
          scale={0.68}
        />
      ))}
      <ResidualPath
        from={positions[0]?.position ?? [0, 0, 0]}
        mobile={mobile}
        to={positions[3]?.position ?? [0, 0, 0]}
      />
      <ResidualPath
        from={positions[3]?.position ?? [0, 0, 0]}
        mobile={mobile}
        to={positions[6]?.position ?? [0, 0, 0]}
      />
    </group>
  );
}

export default function TransformerBlockScene({
  onContextCreated,
  onContextDisposed,
  onContextLost,
  onContextRestored,
  onFrame,
  reducedMotion,
  sceneId,
  state,
  viewport,
}: LearningSceneRendererProps<TransformerBlockState>) {
  const mobile = viewport === "mobile";
  return (
    <LearningSceneCanvas
      camera={{
        fov: mobile ? 48 : 42,
        position: mobile ? [0.45, 0.55, 15.5] : [0.8, 1.15, 12.5],
      }}
      onContextCreated={onContextCreated}
      onContextDisposed={onContextDisposed}
      onContextLost={onContextLost}
      onContextRestored={onContextRestored}
      sceneId={sceneId}
      viewport={viewport}
    >
      <BlockGeometry
        mobile={mobile}
        onFrame={onFrame}
        reducedMotion={reducedMotion}
        state={state}
      />
    </LearningSceneCanvas>
  );
}
