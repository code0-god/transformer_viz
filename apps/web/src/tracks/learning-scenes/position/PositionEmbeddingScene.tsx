import { useCallback, useRef } from "react";
import type { Group } from "three";

import { LearningSceneCanvas } from "../LearningSceneCanvas";
import { LEARNING_SCENE_COLORS } from "../scenePalette";
import { FlowLine, VectorStrip } from "../scenePrimitives";
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
  "0": [
    { id: "position-0-c0", value: 0.15 },
    { id: "position-0-c1", value: -0.45 },
    { id: "position-0-c2", value: 0.35 },
    { id: "position-0-c3", value: 0.6 },
  ],
  "3": [
    { id: "position-3-c0", value: -0.25 },
    { id: "position-3-c1", value: 0.65 },
    { id: "position-3-c2", value: -0.15 },
    { id: "position-3-c3", value: 0.42 },
  ],
} as const;

const RESULT_VALUES = {
  "0": TOKEN_VALUES.map((value, index) => ({
    id: `result-0-c${index}`,
    value: value.value + (POSITION_VALUES["0"][index]?.value ?? 0),
  })),
  "3": TOKEN_VALUES.map((value, index) => ({
    id: `result-3-c${index}`,
    value: value.value + (POSITION_VALUES["3"][index]?.value ?? 0),
  })),
} as const;

function AdditionMark() {
  return (
    <group position={[-2.85, 0.4, 0.1]}>
      <mesh>
        <boxGeometry args={[0.72, 0.12, 0.12]} />
        <meshStandardMaterial color={LEARNING_SCENE_COLORS.position} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.12, 0.72, 0.12]} />
        <meshStandardMaterial color={LEARNING_SCENE_COLORS.position} />
      </mesh>
    </group>
  );
}

function PositionGeometry({
  onFrame,
  reducedMotion,
  state,
}: Readonly<{
  onFrame: () => void;
  reducedMotion: boolean;
  state: PositionEmbeddingState;
}>) {
  const token = useRef<Group>(null);
  const position = useRef<Group>(null);
  const result = useRef<Group>(null);
  const apply = useCallback(
    (progress: number) => {
      const aligned = state.phase !== "separate";
      const summed = state.phase === "sum";
      if (token.current !== null) {
        token.current.position.y = 1.45 - (aligned ? 0.62 * progress : 0);
        token.current.position.z = 0.58 - (aligned ? 0.28 * progress : 0);
      }
      if (position.current !== null) {
        position.current.position.y = -0.42 + (aligned ? 0.62 * progress : 0);
        position.current.position.z = -0.58 + (aligned ? 0.28 * progress : 0);
      }
      if (result.current !== null) {
        result.current.scale.setScalar(summed ? 0.82 + 0.18 * progress : 0.82);
        result.current.position.z = summed ? 0.32 * progress : 0;
      }
    },
    [state.phase],
  );
  useDemandTransition({
    apply,
    duration: 0.64,
    onFrame,
    reducedMotion,
    transitionKey: `${state.position}-${state.phase}-${state.replay}`,
  });

  return (
    <group>
      <group ref={token}>
        <VectorStrip
          color={LEARNING_SCENE_COLORS.token}
          position={[0, 0, 0]}
          values={TOKEN_VALUES}
        />
      </group>
      <AdditionMark />
      <group ref={position}>
        <VectorStrip
          color={LEARNING_SCENE_COLORS.position}
          position={[0, 0, 0]}
          values={POSITION_VALUES[state.position]}
        />
      </group>
      {[-0.93, -0.31, 0.31, 0.93].map((x) => (
        <mesh key={x} position={[x, 0.4, -0.05]}>
          <boxGeometry args={[0.025, 1.58, 0.025]} />
          <meshBasicMaterial
            color={LEARNING_SCENE_COLORS.grid}
            transparent
            opacity={state.phase === "separate" ? 0.22 : 0.52}
          />
        </mesh>
      ))}
      <FlowLine
        color={LEARNING_SCENE_COLORS.output}
        position={[0, -0.78, -0.1]}
        rotation={[0, 0, 0]}
        scale={0.9}
      />
      <group
        ref={result}
        position={[0, -1.65, 0]}
        visible={state.phase === "sum"}
      >
        <VectorStrip
          color={LEARNING_SCENE_COLORS.output}
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
  const mobile = viewport === "mobile";
  return (
    <LearningSceneCanvas
      camera={{
        fov: mobile ? 47 : 40,
        position: mobile ? [0, 0.2, 10.8] : [0, 0.7, 8.8],
      }}
      onContextCreated={onContextCreated}
      onContextDisposed={onContextDisposed}
      onContextLost={onContextLost}
      onContextRestored={onContextRestored}
      sceneId={sceneId}
      viewport={viewport}
    >
      <PositionGeometry
        onFrame={onFrame}
        reducedMotion={reducedMotion}
        state={state}
      />
    </LearningSceneCanvas>
  );
}
