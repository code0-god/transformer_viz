import { useCallback, useRef } from "react";
import type { Group } from "three";

import { LearningSceneCanvas } from "../LearningSceneCanvas";
import { LEARNING_SCENE_COLORS } from "../scenePalette";
import { SceneArrow, TensorGrid } from "../scenePrimitives";
import type { LearningSceneRendererProps } from "../sceneTypes";
import { useDemandTransition } from "../useDemandTransition";
import type {
  HiddenStateSceneState,
  HiddenStateStage,
} from "./HiddenStateSceneFigure";

const STATE_VALUES = {
  x0: [
    { id: "x0-t0-c0", value: 0.2 },
    { id: "x0-t0-c1", value: -0.7 },
    { id: "x0-t0-c2", value: 0.4 },
    { id: "x0-t0-c3", value: 0.8 },
    { id: "x0-t1-c0", value: -0.6 },
    { id: "x0-t1-c1", value: 0.3 },
    { id: "x0-t1-c2", value: 0.9 },
    { id: "x0-t1-c3", value: -0.4 },
  ],
  x1: [
    { id: "x1-t0-c0", value: -0.7 },
    { id: "x1-t0-c1", value: 0.4 },
    { id: "x1-t0-c2", value: 0.8 },
    { id: "x1-t0-c3", value: -0.3 },
    { id: "x1-t1-c0", value: 0.3 },
    { id: "x1-t1-c1", value: -0.9 },
    { id: "x1-t1-c2", value: 0.5 },
    { id: "x1-t1-c3", value: 0.7 },
  ],
  xn: [
    { id: "xn-t0-c0", value: 0.4 },
    { id: "xn-t0-c1", value: 0.9 },
    { id: "xn-t0-c2", value: -0.3 },
    { id: "xn-t0-c3", value: 0.7 },
    { id: "xn-t1-c0", value: -0.8 },
    { id: "xn-t1-c1", value: 0.5 },
    { id: "xn-t1-c2", value: 0.7 },
    { id: "xn-t1-c3", value: -0.2 },
  ],
} as const;

function moveSlab(
  slab: Group | null,
  selected: boolean,
  progress: number,
): void {
  if (slab === null) return;
  const amount = selected ? progress : 0;
  slab.position.z = amount * 0.65;
  slab.scale.setScalar(selected ? 0.94 + amount * 0.12 : 0.9);
}

function HiddenEvolutionGeometry({
  onFrame,
  reducedMotion,
  state,
  viewport,
}: Pick<
  LearningSceneRendererProps<HiddenStateSceneState>,
  "onFrame" | "reducedMotion" | "state" | "viewport"
>) {
  const x0 = useRef<Group>(null);
  const x1 = useRef<Group>(null);
  const xn = useRef<Group>(null);
  const mobile = viewport === "mobile";
  const apply = useCallback(
    (progress: number) => {
      moveSlab(x0.current, state.stage === "x0", progress);
      moveSlab(x1.current, state.stage === "x1", progress);
      moveSlab(xn.current, state.stage === "xn", progress);
    },
    [state.stage],
  );

  useDemandTransition({
    apply,
    onFrame,
    reducedMotion,
    transitionKey: `${state.stage}-${state.replay}`,
  });

  const layouts: Readonly<
    Record<HiddenStateStage, readonly [number, number, number]>
  > = mobile
    ? {
        x0: [0, 2.55, -0.5],
        x1: [0, 0, 0],
        xn: [0, -2.55, 0.5],
      }
    : {
        x0: [-3.1, 0, -0.55],
        x1: [0, 0, 0],
        xn: [3.1, 0, 0.55],
      };

  return (
    <group
      rotation={mobile ? [0.22, -0.12, 0] : [0.28, -0.15, 0]}
      scale={mobile ? 0.9 : 1.15}
    >
      <group position={[...layouts.x0]}>
        <group ref={x0}>
          <TensorGrid
            color={LEARNING_SCENE_COLORS.hidden}
            cols={4}
            position={[0, 0, 0]}
            rows={2}
            selectionActive={false}
            values={STATE_VALUES.x0}
          />
        </group>
      </group>
      <SceneArrow
        position={mobile ? [0, 1.28, 0] : [-1.55, 0, 0]}
        rotation={mobile ? [0, 0, 0] : [0, 0, Math.PI / 2]}
      />
      <group position={[...layouts.x1]}>
        <group ref={x1}>
          <TensorGrid
            color={LEARNING_SCENE_COLORS.hidden}
            cols={4}
            position={[0, 0, 0]}
            rows={2}
            selectionActive={false}
            values={STATE_VALUES.x1}
          />
        </group>
      </group>
      <SceneArrow
        position={mobile ? [0, -1.28, 0] : [1.55, 0, 0]}
        rotation={mobile ? [0, 0, 0] : [0, 0, Math.PI / 2]}
      />
      <group position={[...layouts.xn]}>
        <group ref={xn}>
          <TensorGrid
            color={LEARNING_SCENE_COLORS.hidden}
            cols={4}
            position={[0, 0, 0]}
            rows={2}
            selectionActive={false}
            values={STATE_VALUES.xn}
          />
        </group>
      </group>
    </group>
  );
}

export default function HiddenStateScene({
  onContextCreated,
  onContextDisposed,
  onContextLost,
  onContextRestored,
  onFrame,
  reducedMotion,
  sceneId,
  state,
  viewport,
}: LearningSceneRendererProps<HiddenStateSceneState>) {
  return (
    <LearningSceneCanvas
      camera={{
        fov: viewport === "mobile" ? 46 : 42,
        position: viewport === "mobile" ? [0, 0, 10.5] : [0, 0.4, 10],
      }}
      onContextCreated={onContextCreated}
      onContextDisposed={onContextDisposed}
      onContextLost={onContextLost}
      onContextRestored={onContextRestored}
      sceneId={sceneId}
      viewport={viewport}
    >
      <HiddenEvolutionGeometry
        onFrame={onFrame}
        reducedMotion={reducedMotion}
        state={state}
        viewport={viewport}
      />
    </LearningSceneCanvas>
  );
}
