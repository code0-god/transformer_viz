import { useCallback, useRef } from "react";
import type { Group } from "three";

import { LearningSceneCanvas } from "../LearningSceneCanvas";
import { LEARNING_SCENE_COLORS } from "../scenePalette";
import { FlowLine, LayerPlane, TokenChip } from "../scenePrimitives";
import type { LearningSceneRendererProps } from "../sceneTypes";
import { useDemandTransition } from "../useDemandTransition";
import type { ConditionalProbabilityState } from "./Part1SceneFigures";

const STAGE_INDEX: Readonly<
  Record<ConditionalProbabilityState["stage"], number>
> = {
  w1: 0,
  w2: 1,
  w3: 2,
};
const CONTEXT_LAYERS = ["context-0", "context-1", "context-2"] as const;

function ConditionalChain({
  onFrame,
  reducedMotion,
  state,
}: Readonly<{
  onFrame: () => void;
  reducedMotion: boolean;
  state: ConditionalProbabilityState;
}>) {
  const groups = useRef<(Group | null)[]>([]);
  const active = STAGE_INDEX[state.stage];
  const apply = useCallback(
    (progress: number) => {
      groups.current.forEach((group, index) => {
        if (group === null) return;
        const reached = index <= active;
        group.position.z = reached ? 0.24 * progress * index : -0.15;
        group.scale.setScalar(1 + (index === active ? 0.08 * progress : 0));
      });
    },
    [active],
  );
  useDemandTransition({
    apply,
    duration: 0.52,
    onFrame,
    reducedMotion,
    transitionKey: `${state.stage}-${state.replay}`,
  });

  return (
    <group>
      {["w1", "w2", "w3"].map((token, index) => (
        <group
          key={token}
          ref={(group) => {
            groups.current[index] = group;
          }}
          position={[index * 2.8 - 2.8, 0, 0]}
        >
          {CONTEXT_LAYERS.slice(0, index + 1).map((layerId, layer) => (
            <LayerPlane
              key={`${token}-${layerId}`}
              color={
                layer === index
                  ? LEARNING_SCENE_COLORS.selected
                  : LEARNING_SCENE_COLORS.stageDepth
              }
              opacity={0.28 + layer * 0.14}
              position={[0, 0, -0.32 - layer * 0.22]}
              size={[2.15, 1.75]}
            />
          ))}
          <TokenChip
            color={
              index <= active
                ? LEARNING_SCENE_COLORS.token
                : LEARNING_SCENE_COLORS.neutral
            }
            position={[0, 0, 0]}
            selected={index === active}
          />
        </group>
      ))}
      <FlowLine
        color={LEARNING_SCENE_COLORS.graphite}
        position={[-1.4, 0, -0.1]}
        rotation={[0, 0, Math.PI / 2]}
      />
      <FlowLine
        color={LEARNING_SCENE_COLORS.graphite}
        position={[1.4, 0, -0.1]}
        rotation={[0, 0, Math.PI / 2]}
      />
    </group>
  );
}

export default function ConditionalProbabilityScene({
  onContextCreated,
  onContextDisposed,
  onContextLost,
  onContextRestored,
  onFrame,
  reducedMotion,
  sceneId,
  state,
  viewport,
}: LearningSceneRendererProps<ConditionalProbabilityState>) {
  const mobile = viewport === "mobile";
  return (
    <LearningSceneCanvas
      camera={{
        fov: mobile ? 48 : 40,
        position: mobile ? [0, 0, 12.5] : [0, 0.8, 8.8],
      }}
      onContextCreated={onContextCreated}
      onContextDisposed={onContextDisposed}
      onContextLost={onContextLost}
      onContextRestored={onContextRestored}
      sceneId={sceneId}
      viewport={viewport}
    >
      <ConditionalChain
        onFrame={onFrame}
        reducedMotion={reducedMotion}
        state={state}
      />
    </LearningSceneCanvas>
  );
}
