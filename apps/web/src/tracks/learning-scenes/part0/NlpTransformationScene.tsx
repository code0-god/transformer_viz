import { useCallback, useRef } from "react";
import type { Group } from "three";

import { LearningSceneCanvas } from "../LearningSceneCanvas";
import { LEARNING_SCENE_COLORS } from "../scenePalette";
import {
  ComputationCore,
  FlowLine,
  LayerPlane,
  TokenChip,
  VectorStrip,
} from "../scenePrimitives";
import type { LearningSceneRendererProps } from "../sceneTypes";
import { useDemandTransition } from "../useDemandTransition";
import type { NlpTransformationState } from "./Part0SceneFigures";

const REPRESENTATION_VALUES = [
  { id: "representation-0", value: -0.4 },
  { id: "representation-1", value: 0.65 },
  { id: "representation-2", value: 0.2 },
  { id: "representation-3", value: -0.72 },
] as const;

const STAGE_INDEX: Readonly<Record<NlpTransformationState["stage"], number>> = {
  text: 0,
  representation: 1,
  computation: 2,
  result: 3,
};

function TransformationGeometry({
  mobile,
  onFrame,
  reducedMotion,
  state,
}: Readonly<{
  mobile: boolean;
  onFrame: () => void;
  reducedMotion: boolean;
  state: NlpTransformationState;
}>) {
  const text = useRef<Group>(null);
  const representation = useRef<Group>(null);
  const computation = useRef<Group>(null);
  const result = useRef<Group>(null);
  const groups = [text, representation, computation, result] as const;
  const activeIndex = STAGE_INDEX[state.stage];
  const apply = useCallback(
    (progress: number) => {
      groups.forEach((group, index) => {
        if (group.current === null) return;
        const active = index === activeIndex;
        const scale = 1 + (active ? 0.11 * progress : 0);
        group.current.scale.setScalar(scale);
        group.current.position.z = active ? 0.38 * progress : 0;
      });
    },
    [activeIndex, groups],
  );
  useDemandTransition({
    apply,
    duration: 0.52,
    onFrame,
    reducedMotion,
    transitionKey: `${state.stage}-${state.replay}`,
  });

  const positions = mobile
    ? ([
        [0, 3.1, 0],
        [0, 1.05, 0],
        [0, -1.05, 0],
        [0, -3.1, 0],
      ] as const)
    : ([
        [-4.2, 0, 0],
        [-1.45, 0, 0],
        [1.45, 0, 0],
        [4.2, 0, 0],
      ] as const);

  return (
    <group>
      <group ref={text} position={[...positions[0]]}>
        <TokenChip position={[0, 0, 0]} selected={state.stage === "text"} />
      </group>
      <group ref={representation} position={[...positions[1]]}>
        <LayerPlane
          color={LEARNING_SCENE_COLORS.stageDepth}
          opacity={0.72}
          position={[0, 0, -0.14]}
          size={[2.25, 1.65]}
        />
        <VectorStrip
          color={LEARNING_SCENE_COLORS.position}
          position={[0, 0, 0.05]}
          values={REPRESENTATION_VALUES}
        />
      </group>
      <group ref={computation} position={[...positions[2]]}>
        <ComputationCore
          active={state.stage === "computation"}
          position={[0, 0, 0]}
        />
      </group>
      <group ref={result} position={[...positions[3]]}>
        <TokenChip
          color={LEARNING_SCENE_COLORS.output}
          position={[0, 0, 0]}
          selected={state.stage === "result"}
        />
      </group>
      {positions.slice(0, -1).map((position, index) => {
        const next = positions[index + 1];
        if (next === undefined) return null;
        return (
          <FlowLine
            key={`${position[0]}-${position[1]}`}
            color={LEARNING_SCENE_COLORS.graphite}
            position={[
              (position[0] + next[0]) / 2,
              (position[1] + next[1]) / 2,
              -0.12,
            ]}
            rotation={mobile ? [0, 0, 0] : [0, 0, Math.PI / 2]}
            scale={mobile ? 1.15 : 1.05}
          />
        );
      })}
    </group>
  );
}

export default function NlpTransformationScene({
  onContextCreated,
  onContextDisposed,
  onContextLost,
  onContextRestored,
  onFrame,
  reducedMotion,
  sceneId,
  state,
  viewport,
}: LearningSceneRendererProps<NlpTransformationState>) {
  const mobile = viewport === "mobile";
  return (
    <LearningSceneCanvas
      camera={{
        fov: mobile ? 47 : 42,
        position: mobile ? [0, 0, 11.5] : [0, 0.6, 11],
      }}
      onContextCreated={onContextCreated}
      onContextDisposed={onContextDisposed}
      onContextLost={onContextLost}
      onContextRestored={onContextRestored}
      sceneId={sceneId}
      viewport={viewport}
    >
      <TransformationGeometry
        mobile={mobile}
        onFrame={onFrame}
        reducedMotion={reducedMotion}
        state={state}
      />
    </LearningSceneCanvas>
  );
}
