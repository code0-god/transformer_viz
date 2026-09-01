import { useCallback, useRef } from "react";
import type { Group } from "three";

import { LearningSceneCanvas } from "../LearningSceneCanvas";
import { LEARNING_SCENE_COLORS } from "../scenePalette";
import { ComputationCore, FlowLine, TokenChip } from "../scenePrimitives";
import type { LearningSceneRendererProps } from "../sceneTypes";
import { useDemandTransition } from "../useDemandTransition";
import type { LanguageModelState } from "./Part1SceneFigures";
import { ContextRibbon } from "./part1ScenePrimitives";

const STAGE_INDEX: Readonly<Record<LanguageModelState["stage"], number>> = {
  context: 0,
  model: 1,
  candidates: 2,
};

function LanguageModelGeometry({
  mobile,
  onFrame,
  reducedMotion,
  state,
}: Readonly<{
  mobile: boolean;
  onFrame: () => void;
  reducedMotion: boolean;
  state: LanguageModelState;
}>) {
  const context = useRef<Group>(null);
  const model = useRef<Group>(null);
  const candidates = useRef<Group>(null);
  const groups = [context, model, candidates] as const;
  const active = STAGE_INDEX[state.stage];
  const apply = useCallback(
    (progress: number) => {
      groups.forEach((group, index) => {
        if (group.current === null) return;
        const selected = index === active;
        group.current.scale.setScalar(1 + (selected ? 0.1 * progress : 0));
        group.current.position.z = selected ? 0.34 * progress : 0;
      });
    },
    [active, groups],
  );
  useDemandTransition({
    apply,
    duration: 0.52,
    onFrame,
    reducedMotion,
    transitionKey: `${state.stage}-${state.replay}`,
  });

  const contextPosition = mobile
    ? ([0, 3.05, 0] as const)
    : ([-3.8, 0, 0] as const);
  const modelPosition = mobile ? ([0, 0.2, 0] as const) : ([0, 0, 0] as const);
  const candidatePosition = mobile
    ? ([0, -2.85, 0] as const)
    : ([3.9, 0, 0] as const);
  return (
    <group>
      <group ref={context}>
        <ContextRibbon
          position={contextPosition}
          selected={state.stage === "context"}
          tokens={["The", "cat", "sat", "on", "the"]}
        />
      </group>
      <group ref={model}>
        <ComputationCore
          active={state.stage === "model"}
          position={modelPosition}
          scale={1.15}
        />
      </group>
      <group ref={candidates} position={candidatePosition}>
        {[-1.2, 0, 1.2].map((y, index) => (
          <TokenChip
            key={y}
            color={
              state.stage === "candidates"
                ? LEARNING_SCENE_COLORS.output
                : LEARNING_SCENE_COLORS.neutral
            }
            position={mobile ? [index * 1.7 - 1.7, 0, 0] : [0, y, 0]}
            scale={0.62}
            selected={state.stage === "candidates" && index === 1}
          />
        ))}
      </group>
      <FlowLine
        color={LEARNING_SCENE_COLORS.graphite}
        position={mobile ? [0, 1.65, -0.1] : [-1.9, 0, -0.1]}
        rotation={mobile ? [0, 0, 0] : [0, 0, Math.PI / 2]}
        scale={1.18}
      />
      <FlowLine
        color={LEARNING_SCENE_COLORS.graphite}
        position={mobile ? [0, -1.45, -0.1] : [1.9, 0, -0.1]}
        rotation={mobile ? [0, 0, 0] : [0, 0, Math.PI / 2]}
        scale={1.18}
      />
    </group>
  );
}

export default function LanguageModelScene({
  onContextCreated,
  onContextDisposed,
  onContextLost,
  onContextRestored,
  onFrame,
  reducedMotion,
  sceneId,
  state,
  viewport,
}: LearningSceneRendererProps<LanguageModelState>) {
  const mobile = viewport === "mobile";
  return (
    <LearningSceneCanvas
      camera={{
        fov: mobile ? 48 : 42,
        position: mobile ? [0, 0, 12] : [0, 0.7, 10.8],
      }}
      onContextCreated={onContextCreated}
      onContextDisposed={onContextDisposed}
      onContextLost={onContextLost}
      onContextRestored={onContextRestored}
      sceneId={sceneId}
      viewport={viewport}
    >
      <LanguageModelGeometry
        mobile={mobile}
        onFrame={onFrame}
        reducedMotion={reducedMotion}
        state={state}
      />
    </LearningSceneCanvas>
  );
}
