import { useCallback, useRef } from "react";
import type { Group } from "three";

import { LearningSceneCanvas } from "../LearningSceneCanvas";
import { LEARNING_SCENE_COLORS } from "../scenePalette";
import { ComputationCore, FlowLine, TokenChip } from "../scenePrimitives";
import type { LearningSceneRendererProps } from "../sceneTypes";
import { useDemandTransition } from "../useDemandTransition";
import type { AutoregressiveState } from "./Part1SceneFigures";
import { ContextRibbon } from "./part1ScenePrimitives";

const STAGE_INDEX: Readonly<Record<AutoregressiveState["stage"], number>> = {
  predict: 0,
  select: 1,
  append: 2,
  repeat: 3,
};

function AutoregressiveGeometry({
  mobile,
  onFrame,
  reducedMotion,
  state,
}: Readonly<{
  mobile: boolean;
  onFrame: () => void;
  reducedMotion: boolean;
  state: AutoregressiveState;
}>) {
  const current = useRef<Group>(null);
  const model = useRef<Group>(null);
  const selected = useRef<Group>(null);
  const updated = useRef<Group>(null);
  const groups = [current, model, selected, updated] as const;
  const active = STAGE_INDEX[state.stage];
  const apply = useCallback(
    (progress: number) => {
      groups.forEach((group, index) => {
        if (group.current === null) return;
        group.current.scale.setScalar(
          1 + (index === active ? 0.09 * progress : 0),
        );
        group.current.position.z = index === active ? 0.3 * progress : 0;
      });
    },
    [active, groups],
  );
  useDemandTransition({
    apply,
    duration: 0.54,
    onFrame,
    reducedMotion,
    transitionKey: `${state.stage}-${state.replay}`,
  });

  const currentPosition = mobile
    ? ([0, 3.2, 0] as const)
    : ([-4, 1.05, 0] as const);
  const modelPosition = mobile
    ? ([0, 1, 0] as const)
    : ([-1.15, 1.05, 0] as const);
  const selectedPosition = mobile
    ? ([0, -1.15, 0] as const)
    : ([1.8, 1.05, 0] as const);
  const updatedPosition = mobile
    ? ([0, -3.25, 0] as const)
    : ([2.65, -1.55, 0] as const);

  return (
    <group>
      <group ref={current}>
        <ContextRibbon
          position={currentPosition}
          selected={state.stage === "predict"}
          tokens={["The", "cat"]}
        />
      </group>
      <group ref={model}>
        <ComputationCore
          active={state.stage === "predict"}
          position={modelPosition}
          scale={0.9}
        />
      </group>
      <group ref={selected}>
        <TokenChip
          color={LEARNING_SCENE_COLORS.selected}
          position={selectedPosition}
          scale={0.68}
          selected={state.stage === "select"}
        />
      </group>
      <group
        ref={updated}
        visible={state.stage === "append" || state.stage === "repeat"}
      >
        <ContextRibbon
          color={LEARNING_SCENE_COLORS.output}
          position={updatedPosition}
          selected
          tokens={["The", "cat", "s"]}
        />
      </group>
      <FlowLine
        color={LEARNING_SCENE_COLORS.graphite}
        position={mobile ? [0, 2.1, -0.1] : [-2.55, 1.05, -0.1]}
        rotation={mobile ? [0, 0, 0] : [0, 0, Math.PI / 2]}
      />
      <FlowLine
        color={LEARNING_SCENE_COLORS.graphite}
        position={mobile ? [0, -0.05, -0.1] : [0.35, 1.05, -0.1]}
        rotation={mobile ? [0, 0, 0] : [0, 0, Math.PI / 2]}
      />
      <FlowLine
        color={LEARNING_SCENE_COLORS.graphite}
        position={mobile ? [0, -2.2, -0.1] : [2.2, -0.15, -0.1]}
        rotation={mobile ? [0, 0, 0] : [0, 0, -0.45]}
        scale={1.2}
      />
      {mobile ? null : (
        <FlowLine
          color={LEARNING_SCENE_COLORS.residual}
          length={9}
          position={[-3.65, -1.55, -0.35]}
          rotation={[0, 0, -Math.PI / 2]}
        />
      )}
      <FlowLine
        color={LEARNING_SCENE_COLORS.residual}
        length={mobile ? 9 : 4.2}
        position={mobile ? [2.5, 2.75, -0.35] : [-4, 0.95, -0.35]}
        rotation={[0, 0, Math.PI]}
      />
    </group>
  );
}

export default function AutoregressiveScene({
  onContextCreated,
  onContextDisposed,
  onContextLost,
  onContextRestored,
  onFrame,
  reducedMotion,
  sceneId,
  state,
  viewport,
}: LearningSceneRendererProps<AutoregressiveState>) {
  const mobile = viewport === "mobile";
  return (
    <LearningSceneCanvas
      camera={{
        fov: mobile ? 49 : 42,
        position: mobile ? [0, 0, 12.5] : [0, 0.8, 11],
      }}
      onContextCreated={onContextCreated}
      onContextDisposed={onContextDisposed}
      onContextLost={onContextLost}
      onContextRestored={onContextRestored}
      sceneId={sceneId}
      viewport={viewport}
    >
      <AutoregressiveGeometry
        mobile={mobile}
        onFrame={onFrame}
        reducedMotion={reducedMotion}
        state={state}
      />
    </LearningSceneCanvas>
  );
}
