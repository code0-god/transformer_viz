import { useCallback, useRef } from "react";
import type { Group } from "three";

import { LearningSceneCanvas } from "../LearningSceneCanvas";
import { LEARNING_SCENE_COLORS } from "../scenePalette";
import { SceneArrow, TensorGrid, VectorRow } from "../scenePrimitives";
import type { LearningSceneRendererProps } from "../sceneTypes";
import { useDemandTransition } from "../useDemandTransition";
import type { TokenEmbeddingState } from "./TokenEmbeddingSceneFigure";

const TABLE_VALUES = [
  { id: "r0-c0", value: 0.2 },
  { id: "r0-c1", value: -0.6 },
  { id: "r0-c2", value: 0.4 },
  { id: "r0-c3", value: 0.8 },
  { id: "r1-c0", value: -0.3 },
  { id: "r1-c1", value: 0.7 },
  { id: "r1-c2", value: -0.8 },
  { id: "r1-c3", value: 0.1 },
  { id: "r2-c0", value: 0.6 },
  { id: "r2-c1", value: 0.3 },
  { id: "r2-c2", value: -0.4 },
  { id: "r2-c3", value: 0.9 },
  { id: "r3-c0", value: -0.7 },
  { id: "r3-c1", value: 0.5 },
  { id: "r3-c2", value: 0.2 },
  { id: "r3-c3", value: -0.2 },
  { id: "r4-c0", value: 0.8 },
  { id: "r4-c1", value: -0.5 },
  { id: "r4-c2", value: 0.7 },
  { id: "r4-c3", value: 0.3 },
] as const;

const VECTOR_VALUES = {
  cat: [
    { id: "cat-c0", value: -0.7 },
    { id: "cat-c1", value: 0.5 },
    { id: "cat-c2", value: 0.2 },
    { id: "cat-c3", value: -0.2 },
  ],
  the: [
    { id: "the-c0", value: -0.3 },
    { id: "the-c1", value: 0.7 },
    { id: "the-c2", value: -0.8 },
    { id: "the-c3", value: 0.1 },
  ],
} as const;

function TokenLookupGeometry({
  onFrame,
  reducedMotion,
  state,
  viewport,
}: Pick<
  LearningSceneRendererProps<TokenEmbeddingState>,
  "onFrame" | "reducedMotion" | "state" | "viewport"
>) {
  const extracted = useRef<Group>(null);
  const connector = useRef<Group>(null);
  const selectedRowGroup = useRef<Group>(null);
  const mobile = viewport === "mobile";
  const selectedRow = state.token === "the" ? 1 : 3;
  const finalVector = mobile
    ? ([0, -2.72, 0.35] as const)
    : ([3.15, -0.05, 0.4] as const);
  const originVector = mobile
    ? ([0, -1.25, 0] as const)
    : ([1.1, -0.05, 0] as const);
  const apply = useCallback(
    (progress: number) => {
      const selectionProgress =
        state.phase === "id" ? 0 : state.phase === "lookup" ? progress : 1;
      const extractionProgress = state.phase === "vector" ? progress : 0;
      if (selectedRowGroup.current !== null) {
        selectedRowGroup.current.position.z = selectionProgress * 0.55;
      }
      if (extracted.current !== null) {
        extracted.current.visible = state.phase === "vector";
        extracted.current.position.set(
          originVector[0] +
            (finalVector[0] - originVector[0]) * extractionProgress,
          originVector[1] +
            (finalVector[1] - originVector[1]) * extractionProgress,
          originVector[2] +
            (finalVector[2] - originVector[2]) * extractionProgress,
        );
      }
      if (connector.current !== null) {
        connector.current.visible = state.phase === "vector";
        connector.current.scale.setScalar(0.35 + extractionProgress * 0.65);
      }
    },
    [finalVector, originVector, state.phase],
  );

  useDemandTransition({
    apply,
    onFrame,
    reducedMotion,
    transitionKey: `${state.token}-${state.phase}-${state.replay}`,
  });

  return (
    <group
      position={mobile ? [0, 0.1, 0] : [0, 0, 0]}
      rotation={mobile ? [0.06, -0.12, 0] : [0.08, -0.18, 0]}
      scale={mobile ? 0.88 : 1}
    >
      <mesh position={mobile ? [0, 3, -0.2] : [-3.25, 0, -0.15]}>
        <boxGeometry args={[1.45, 0.82, 0.28]} />
        <meshStandardMaterial
          color={LEARNING_SCENE_COLORS.token}
          emissive={LEARNING_SCENE_COLORS.token}
          emissiveIntensity={0.15}
          metalness={0.08}
          roughness={0.64}
        />
      </mesh>
      <TensorGrid
        cols={4}
        position={mobile ? [0, 0.15, 0] : [-0.35, 0, 0]}
        rowLift={0}
        rows={5}
        selectionActive={state.phase !== "id"}
        selectedRow={selectedRow}
        selectedRowRef={selectedRowGroup}
        values={TABLE_VALUES}
      />
      {state.phase === "id" ? null : (
        <SceneArrow
          color={LEARNING_SCENE_COLORS.token}
          position={mobile ? [0, 1.65, 0.1] : [-1.95, 0, 0.1]}
          rotation={mobile ? [0, 0, 0] : [0, 0, Math.PI / 2]}
          scale={mobile ? 1.1 : 1}
        />
      )}
      <group ref={connector}>
        <SceneArrow
          position={mobile ? [0, -1.7, 0.1] : [1.62, -0.05, 0.15]}
          rotation={mobile ? [0, 0, 0] : [0, 0, Math.PI / 2]}
          scale={mobile ? 1.15 : 1}
        />
      </group>
      <group ref={extracted} visible={state.phase === "vector"}>
        <VectorRow
          color={LEARNING_SCENE_COLORS.selected}
          position={[0, 0, 0]}
          values={VECTOR_VALUES[state.token]}
        />
      </group>
    </group>
  );
}

export default function TokenEmbeddingScene({
  onContextCreated,
  onContextDisposed,
  onContextLost,
  onContextRestored,
  onFrame,
  reducedMotion,
  sceneId,
  state,
  viewport,
}: LearningSceneRendererProps<TokenEmbeddingState>) {
  return (
    <LearningSceneCanvas
      camera={{
        fov: viewport === "mobile" ? 46 : 42,
        position: viewport === "mobile" ? [0, 0.2, 10] : [0, 0.4, 9],
      }}
      onContextCreated={onContextCreated}
      onContextDisposed={onContextDisposed}
      onContextLost={onContextLost}
      onContextRestored={onContextRestored}
      sceneId={sceneId}
      viewport={viewport}
    >
      <TokenLookupGeometry
        onFrame={onFrame}
        reducedMotion={reducedMotion}
        state={state}
        viewport={viewport}
      />
    </LearningSceneCanvas>
  );
}
