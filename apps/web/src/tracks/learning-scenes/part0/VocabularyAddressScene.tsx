import { useCallback, useRef } from "react";
import type { Group } from "three";

import { LearningSceneCanvas } from "../LearningSceneCanvas";
import { LEARNING_SCENE_COLORS } from "../scenePalette";
import { FlowLine, TokenChip } from "../scenePrimitives";
import type { LearningSceneRendererProps } from "../sceneTypes";
import { useDemandTransition } from "../useDemandTransition";
import type { VocabularyAddressState } from "./Part0SceneFigures";

const TOKEN_SLOT = {
  cat: 3,
  the: 1,
} as const;
const VOCABULARY_SLOTS = [
  "slot-0",
  "slot-1",
  "slot-2",
  "slot-3",
  "slot-4",
] as const;

function VocabularyGeometry({
  mobile,
  onFrame,
  reducedMotion,
  state,
}: Readonly<{
  mobile: boolean;
  onFrame: () => void;
  reducedMotion: boolean;
  state: VocabularyAddressState;
}>) {
  const selectedSlot = useRef<Group>(null);
  const idBadge = useRef<Group>(null);
  const apply = useCallback(
    (progress: number) => {
      if (selectedSlot.current !== null) {
        selectedSlot.current.position.z =
          state.phase === "token" ? 0 : 0.42 * progress;
        selectedSlot.current.scale.setScalar(
          1 + (state.phase === "token" ? 0 : 0.08 * progress),
        );
      }
      if (idBadge.current !== null) {
        idBadge.current.scale.setScalar(
          state.phase === "id" ? 0.88 + 0.12 * progress : 0.88,
        );
      }
    },
    [state.phase],
  );
  useDemandTransition({
    apply,
    duration: 0.5,
    onFrame,
    reducedMotion,
    transitionKey: `${state.token}-${state.phase}-${state.replay}`,
  });

  const tokenPosition = mobile
    ? ([0, 3.05, 0] as const)
    : ([-3.7, 0, 0] as const);
  const rackPosition = [0, 0, 0] as const;
  const idPosition = mobile ? ([0, -3.05, 0] as const) : ([3.7, 0, 0] as const);
  const selectedIndex = TOKEN_SLOT[state.token];

  return (
    <group>
      <TokenChip position={tokenPosition} selected={state.phase === "token"} />
      <group position={rackPosition}>
        {VOCABULARY_SLOTS.map((slot, index) => {
          const selected = index === selectedIndex;
          return (
            <group
              key={slot}
              position={[0, 2.25 - index * 1.12, 0]}
              {...(selected ? { ref: selectedSlot } : {})}
            >
              <mesh>
                <boxGeometry args={[2.5, 0.82, 0.18]} />
                <meshStandardMaterial
                  color={
                    selected && state.phase !== "token"
                      ? LEARNING_SCENE_COLORS.selected
                      : LEARNING_SCENE_COLORS.neutral
                  }
                  emissive={LEARNING_SCENE_COLORS.selected}
                  emissiveIntensity={
                    selected && state.phase !== "token" ? 0.08 : 0
                  }
                  metalness={0.01}
                  roughness={0.86}
                  transparent
                  opacity={selected ? 1 : 0.64}
                />
              </mesh>
            </group>
          );
        })}
      </group>
      <group ref={idBadge} position={idPosition}>
        <TokenChip
          color={LEARNING_SCENE_COLORS.output}
          position={[0, 0, 0]}
          selected={state.phase === "id"}
        />
      </group>
      <FlowLine
        color={LEARNING_SCENE_COLORS.graphite}
        position={mobile ? [0, 1.7, -0.1] : [-2.1, 0, -0.1]}
        rotation={mobile ? [0, 0, 0] : [0, 0, Math.PI / 2]}
        scale={1.1}
      />
      <FlowLine
        color={LEARNING_SCENE_COLORS.graphite}
        position={mobile ? [0, -1.7, -0.1] : [2.1, 0, -0.1]}
        rotation={mobile ? [0, 0, 0] : [0, 0, Math.PI / 2]}
        scale={1.1}
      />
    </group>
  );
}

export default function VocabularyAddressScene({
  onContextCreated,
  onContextDisposed,
  onContextLost,
  onContextRestored,
  onFrame,
  reducedMotion,
  sceneId,
  state,
  viewport,
}: LearningSceneRendererProps<VocabularyAddressState>) {
  const mobile = viewport === "mobile";
  return (
    <LearningSceneCanvas
      camera={{
        fov: mobile ? 48 : 42,
        position: mobile ? [0, 0, 11.5] : [0, 0.8, 10.5],
      }}
      onContextCreated={onContextCreated}
      onContextDisposed={onContextDisposed}
      onContextLost={onContextLost}
      onContextRestored={onContextRestored}
      sceneId={sceneId}
      viewport={viewport}
    >
      <VocabularyGeometry
        mobile={mobile}
        onFrame={onFrame}
        reducedMotion={reducedMotion}
        state={state}
      />
    </LearningSceneCanvas>
  );
}
