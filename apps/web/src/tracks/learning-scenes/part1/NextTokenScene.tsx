import { useCallback, useRef } from "react";
import type { Mesh } from "three";

import { LearningSceneCanvas } from "../LearningSceneCanvas";
import { LEARNING_SCENE_COLORS } from "../scenePalette";
import { LayerPlane } from "../scenePrimitives";
import type { LearningSceneRendererProps } from "../sceneTypes";
import { useDemandTransition } from "../useDemandTransition";
import type { NextTokenState } from "./Part1SceneFigures";

const HEIGHTS = {
  logits: [2.8, 1.8, 0.85],
  probability: [1.15, 2.75, 0.8],
  selection: [0.92, 3.15, 0.62],
} as const;
const CANDIDATES = ["candidate-a", "candidate-b", "candidate-c"] as const;

function CandidateTransformation({
  onFrame,
  reducedMotion,
  state,
}: Readonly<{
  onFrame: () => void;
  reducedMotion: boolean;
  state: NextTokenState;
}>) {
  const bars = useRef<(Mesh | null)[]>([]);
  const apply = useCallback(
    (progress: number) => {
      bars.current.forEach((bar, index) => {
        if (bar === null) return;
        const target = HEIGHTS[state.stage][index] ?? 0.8;
        const height = 0.7 + (target - 0.7) * progress;
        bar.scale.y = height;
        bar.position.y = -1.35 + height / 2;
        bar.position.z =
          state.stage === "selection" && index === 1 ? 0.4 * progress : 0;
      });
    },
    [state.stage],
  );
  useDemandTransition({
    apply,
    duration: 0.62,
    onFrame,
    reducedMotion,
    transitionKey: `${state.stage}-${state.replay}`,
  });

  return (
    <group>
      {CANDIDATES.map((candidate, index) => {
        const selected = state.stage === "selection" && index === 1;
        return (
          <mesh
            key={candidate}
            ref={(mesh) => {
              bars.current[index] = mesh;
            }}
            position={[index * 2.15 - 2.15, -1, 0]}
          >
            <boxGeometry args={[1.25, 1, 0.38]} />
            <meshStandardMaterial
              color={
                selected
                  ? LEARNING_SCENE_COLORS.selected
                  : state.stage === "logits"
                    ? LEARNING_SCENE_COLORS.hidden
                    : LEARNING_SCENE_COLORS.output
              }
              emissive={LEARNING_SCENE_COLORS.selected}
              emissiveIntensity={selected ? 0.1 : 0.01}
              metalness={0.01}
              roughness={0.82}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export default function NextTokenScene({
  onContextCreated,
  onContextDisposed,
  onContextLost,
  onContextRestored,
  onFrame,
  reducedMotion,
  sceneId,
  state,
  viewport,
}: LearningSceneRendererProps<NextTokenState>) {
  const mobile = viewport === "mobile";
  return (
    <LearningSceneCanvas
      camera={{
        fov: mobile ? 47 : 40,
        position: mobile ? [0, 0.2, 10] : [0, 0.7, 8.5],
      }}
      onContextCreated={onContextCreated}
      onContextDisposed={onContextDisposed}
      onContextLost={onContextLost}
      onContextRestored={onContextRestored}
      sceneId={sceneId}
      viewport={viewport}
    >
      <LayerPlane
        color={LEARNING_SCENE_COLORS.stageDepth}
        opacity={0.44}
        position={[0, -1.4, -0.28]}
        size={[7.5, 0.12]}
      />
      <CandidateTransformation
        onFrame={onFrame}
        reducedMotion={reducedMotion}
        state={state}
      />
    </LearningSceneCanvas>
  );
}
