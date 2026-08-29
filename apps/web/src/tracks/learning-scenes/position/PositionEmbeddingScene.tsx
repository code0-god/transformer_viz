import { useCallback, useRef } from "react";
import type { Group } from "three";

import { LearningSceneCanvas } from "../LearningSceneCanvas";
import { LEARNING_SCENE_COLORS } from "../scenePalette";
import { SceneArrow, VectorRow } from "../scenePrimitives";
import type { LearningSceneRendererProps } from "../sceneTypes";
import { useDemandTransition } from "../useDemandTransition";
import type { PositionEmbeddingState } from "./PositionEmbeddingSceneFigure";

const TOKEN_VALUES = [
  { id: "token-c0", value: -0.55 },
  { id: "token-c1", value: 0.35 },
  { id: "token-c2", value: 0.7 },
  { id: "token-c3", value: -0.2 },
] as const;

const POSITION_VALUES = {
  0: [
    { id: "position-0-c0", value: 0.25 },
    { id: "position-0-c1", value: -0.45 },
    { id: "position-0-c2", value: 0.15 },
    { id: "position-0-c3", value: 0.5 },
  ],
  1: [
    { id: "position-1-c0", value: -0.35 },
    { id: "position-1-c1", value: 0.2 },
    { id: "position-1-c2", value: -0.4 },
    { id: "position-1-c3", value: 0.3 },
  ],
} as const;

const RESULT_VALUES = {
  0: TOKEN_VALUES.map(({ id, value }, channel) => ({
    id: `${id}-position-0`,
    value: value + (POSITION_VALUES[0][channel]?.value ?? 0),
  })),
  1: TOKEN_VALUES.map(({ id, value }, channel) => ({
    id: `${id}-position-1`,
    value: value + (POSITION_VALUES[1][channel]?.value ?? 0),
  })),
} as const;

const CHANNEL_GUIDES = [
  { id: "guide-c0", x: -0.93 },
  { id: "guide-c1", x: -0.31 },
  { id: "guide-c2", x: 0.31 },
  { id: "guide-c3", x: 0.93 },
] as const;

function AdditionMark({
  position,
}: Readonly<{ position: readonly [number, number, number] }>) {
  return (
    <group position={[...position]}>
      <mesh>
        <boxGeometry args={[0.5, 0.08, 0.08]} />
        <meshStandardMaterial color={LEARNING_SCENE_COLORS.position} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.08, 0.5, 0.08]} />
        <meshStandardMaterial color={LEARNING_SCENE_COLORS.position} />
      </mesh>
    </group>
  );
}

function PositionCompositionGeometry({
  onFrame,
  reducedMotion,
  state,
  viewport,
}: Pick<
  LearningSceneRendererProps<PositionEmbeddingState>,
  "onFrame" | "reducedMotion" | "state" | "viewport"
>) {
  const result = useRef<Group>(null);
  const resultArrow = useRef<Group>(null);
  const positionRow = useRef<Group>(null);
  const mobile = viewport === "mobile";
  const apply = useCallback(
    (progress: number) => {
      if (positionRow.current !== null) {
        positionRow.current.position.z = -0.35 + progress * 0.55;
      }
      if (result.current !== null) {
        result.current.visible = state.phase === "sum";
        result.current.position.set(
          0,
          -0.35 + (-1.85 + 0.35) * progress,
          progress * 0.45,
        );
        result.current.scale.setScalar(0.72 + progress * 0.28);
      }
      if (resultArrow.current !== null) {
        resultArrow.current.visible = state.phase === "sum";
        resultArrow.current.scale.setScalar(0.35 + progress * 0.65);
      }
    },
    [state.phase],
  );

  useDemandTransition({
    apply,
    onFrame,
    reducedMotion,
    transitionKey: `${state.position}-${state.phase}-${state.replay}`,
  });

  return (
    <group
      position={mobile ? [0, 0.15, 0] : [0, 0.1, 0]}
      rotation={mobile ? [0.04, -0.12, 0] : [0.1, -0.2, 0]}
      scale={mobile ? 0.9 : 1.28}
    >
      {CHANNEL_GUIDES.map(({ id, x }) => (
        <mesh key={id} position={[x, 1.15, -0.25]}>
          <cylinderGeometry args={[0.012, 0.012, 1.2, 8]} />
          <meshStandardMaterial
            color={LEARNING_SCENE_COLORS.grid}
            transparent
            opacity={0.45}
          />
        </mesh>
      ))}
      <VectorRow
        color={LEARNING_SCENE_COLORS.token}
        position={[0, 1.75, 0]}
        values={TOKEN_VALUES}
      />
      <AdditionMark position={[-2.15, 0.9, 0]} />
      <group ref={positionRow}>
        <VectorRow
          color={LEARNING_SCENE_COLORS.position}
          position={[0, 0.4, 0]}
          values={POSITION_VALUES[state.position]}
        />
      </group>
      <group ref={resultArrow}>
        <SceneArrow
          position={[0, -0.65, 0.1]}
          rotation={[0, 0, 0]}
          scale={0.9}
        />
      </group>
      <group ref={result} visible={state.phase === "sum"}>
        <VectorRow
          color={LEARNING_SCENE_COLORS.selected}
          position={[0, 0, 0]}
          values={RESULT_VALUES[state.position]}
        />
      </group>
    </group>
  );
}

export default function PositionEmbeddingScene({
  onContextCreated,
  onContextDisposed,
  onContextLost,
  onContextRestored,
  onFrame,
  reducedMotion,
  sceneId,
  state,
  viewport,
}: LearningSceneRendererProps<PositionEmbeddingState>) {
  return (
    <LearningSceneCanvas
      camera={{
        fov: viewport === "mobile" ? 46 : 42,
        position: viewport === "mobile" ? [0, 0, 9.5] : [0, 0.2, 9],
      }}
      onContextCreated={onContextCreated}
      onContextDisposed={onContextDisposed}
      onContextLost={onContextLost}
      onContextRestored={onContextRestored}
      sceneId={sceneId}
      viewport={viewport}
    >
      <PositionCompositionGeometry
        onFrame={onFrame}
        reducedMotion={reducedMotion}
        state={state}
        viewport={viewport}
      />
    </LearningSceneCanvas>
  );
}
