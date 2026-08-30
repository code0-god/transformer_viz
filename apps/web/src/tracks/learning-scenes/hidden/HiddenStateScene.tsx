import { useCallback, useRef } from "react";
import type { Group } from "three";

import { LearningSceneCanvas } from "../LearningSceneCanvas";
import { LEARNING_SCENE_COLORS } from "../scenePalette";
import { FlowLine, SelectionFrame, TensorGrid } from "../scenePrimitives";
import type { LearningSceneRendererProps } from "../sceneTypes";
import { useDemandTransition } from "../useDemandTransition";
import type {
  HiddenStateSceneState,
  HiddenStateStage,
} from "./HiddenStateSceneFigure";

const STATE_VALUES: Readonly<
  Record<HiddenStateStage, readonly Readonly<{ id: string; value: number }>[]>
> = {
  x0: [0.2, -0.7, 0.4, 0.8, -0.6, 0.3, -0.9, 0.5].map((value, index) => ({
    id: `x0-c${index}`,
    value,
  })),
  x1: [0.72, -0.22, -0.58, 0.36, 0.18, -0.82, 0.64, -0.31].map(
    (value, index) => ({ id: `x1-c${index}`, value }),
  ),
  xn: [-0.42, 0.88, 0.26, -0.65, 0.76, -0.36, 0.54, 0.21].map(
    (value, index) => ({ id: `xn-c${index}`, value }),
  ),
};

const STAGES = ["x0", "x1", "xn"] as const;

function HiddenGeometry({
  mobile,
  onFrame,
  reducedMotion,
  state,
}: Readonly<{
  mobile: boolean;
  onFrame: () => void;
  reducedMotion: boolean;
  state: HiddenStateSceneState;
}>) {
  const frames = useRef<(Group | null)[]>([]);
  const active = STAGES.indexOf(state.stage);
  const apply = useCallback(
    (progress: number) => {
      frames.current.forEach((frame, index) => {
        if (frame === null) return;
        frame.visible = index === active;
        frame.position.z = index === active ? 0.24 * progress : 0;
      });
    },
    [active],
  );
  useDemandTransition({
    apply,
    duration: 0.46,
    onFrame,
    reducedMotion,
    transitionKey: `${state.stage}-${state.replay}`,
  });

  const positions = mobile
    ? ([
        [0, 2.65, 0],
        [0, 0, 0],
        [0, -2.65, 0],
      ] as const)
    : ([
        [-3.35, 0, 0],
        [0, 0, 0],
        [3.35, 0, 0],
      ] as const);

  return (
    <group>
      {STAGES.map((stage, index) => {
        const position = positions[index] ?? positions[0];
        return (
          <group key={stage} position={[...position]}>
            <SelectionFrame
              color={LEARNING_SCENE_COLORS.graphite}
              position={[0, 0, 0]}
              size={[2.65, 1.38, 0.28]}
            />
            <TensorGrid
              cols={4}
              encoding="intensity"
              position={[0, 0, 0]}
              rows={2}
              selectionActive={false}
              values={STATE_VALUES[stage]}
            />
            <group
              ref={(frame) => {
                frames.current[index] = frame;
              }}
            >
              <SelectionFrame
                color={LEARNING_SCENE_COLORS.selected}
                position={[0, 0, 0]}
                size={[2.75, 1.48, 0.32]}
              />
            </group>
          </group>
        );
      })}
      <FlowLine
        color={LEARNING_SCENE_COLORS.graphite}
        position={mobile ? [0, 1.35, -0.12] : [-1.68, 0, -0.12]}
        rotation={mobile ? [0, 0, 0] : [0, 0, Math.PI / 2]}
      />
      <FlowLine
        color={LEARNING_SCENE_COLORS.graphite}
        position={mobile ? [0, -1.35, -0.12] : [1.68, 0, -0.12]}
        rotation={mobile ? [0, 0, 0] : [0, 0, Math.PI / 2]}
      />
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
  const mobile = viewport === "mobile";
  return (
    <LearningSceneCanvas
      camera={{
        fov: mobile ? 48 : 40,
        position: mobile ? [0, 0, 13.5] : [0, 0.7, 9.6],
      }}
      onContextCreated={onContextCreated}
      onContextDisposed={onContextDisposed}
      onContextLost={onContextLost}
      onContextRestored={onContextRestored}
      sceneId={sceneId}
      viewport={viewport}
    >
      <HiddenGeometry
        mobile={mobile}
        onFrame={onFrame}
        reducedMotion={reducedMotion}
        state={state}
      />
    </LearningSceneCanvas>
  );
}
