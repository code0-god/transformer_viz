import { useCallback, useRef } from "react";
import type { Group } from "three";

import { LearningSceneCanvas } from "../LearningSceneCanvas";
import { LEARNING_SCENE_COLORS } from "../scenePalette";
import {
  FlowLine,
  SelectionFrame,
  TensorGrid,
  TokenChip,
  VectorStrip,
} from "../scenePrimitives";
import type { LearningSceneRendererProps } from "../sceneTypes";
import { useDemandTransition } from "../useDemandTransition";
import type { TokenEmbeddingState } from "./TokenEmbeddingSceneFigure";

const TABLE_VALUES = Array.from({ length: 30 }, (_, index) => ({
  id: `embedding-r${Math.floor(index / 6)}-c${index % 6}`,
  value: (((index * 37) % 19) - 9) / 10,
}));

const VECTOR_VALUES = {
  cat: Array.from({ length: 6 }, (_, index) => ({
    id: `cat-c${index}`,
    value: (((index * 11) % 9) - 4) / 5,
  })),
  the: Array.from({ length: 6 }, (_, index) => ({
    id: `the-c${index}`,
    value: (((index * 7) % 11) - 5) / 6,
  })),
} as const;

function EmbeddingGeometry({
  mobile,
  onFrame,
  reducedMotion,
  state,
}: Readonly<{
  mobile: boolean;
  onFrame: () => void;
  reducedMotion: boolean;
  state: TokenEmbeddingState;
}>) {
  const selectedRow = useRef<Group>(null);
  const extracted = useRef<Group>(null);
  const apply = useCallback(
    (progress: number) => {
      if (selectedRow.current !== null) {
        selectedRow.current.position.z =
          state.phase === "id" ? 0 : 0.52 * progress;
      }
      if (extracted.current !== null) {
        const visible = state.phase === "vector";
        extracted.current.scale.setScalar(
          visible ? 0.82 + 0.18 * progress : 0.82,
        );
        extracted.current.position.z = visible ? 0.34 * progress : 0;
      }
    },
    [state.phase],
  );
  useDemandTransition({
    apply,
    duration: 0.58,
    onFrame,
    reducedMotion,
    transitionKey: `${state.token}-${state.phase}-${state.replay}`,
  });

  const tokenPosition = mobile
    ? ([0, 3.35, 0] as const)
    : ([-4.5, 0, 0] as const);
  const tablePosition = mobile
    ? ([0, 0, 0] as const)
    : ([-0.45, 0, 0] as const);
  const vectorPosition = mobile
    ? ([0, -3.4, 0] as const)
    : ([4.1, 0, 0] as const);

  return (
    <group>
      <TokenChip position={tokenPosition} selected={state.phase === "id"} />
      <group
        position={tablePosition}
        scale={mobile ? [1.02, 1.02, 1] : [1.28, 1.28, 1]}
      >
        <TensorGrid
          cols={6}
          position={[0, 0, 0]}
          rows={5}
          selectionActive={state.phase !== "id"}
          selectedRow={2}
          selectedRowRef={selectedRow}
          values={TABLE_VALUES}
        />
        <SelectionFrame
          color={LEARNING_SCENE_COLORS.graphite}
          position={[0, 0, -0.08]}
          size={[3.85, 3.25, 0.12]}
        />
      </group>
      <group
        ref={extracted}
        position={vectorPosition}
        visible={state.phase === "vector"}
      >
        <VectorStrip
          color={LEARNING_SCENE_COLORS.output}
          position={[0, 0, 0]}
          values={VECTOR_VALUES[state.token]}
        />
      </group>
      <FlowLine
        color={LEARNING_SCENE_COLORS.graphite}
        position={mobile ? [0, 2.15, -0.15] : [-2.72, 0, -0.15]}
        rotation={mobile ? [0, 0, 0] : [0, 0, Math.PI / 2]}
        scale={1.15}
      />
      <FlowLine
        color={LEARNING_SCENE_COLORS.output}
        position={mobile ? [0, -2.15, -0.15] : [2.15, 0, -0.15]}
        rotation={mobile ? [0, 0, 0] : [0, 0, Math.PI / 2]}
        scale={1.15}
      />
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
  const mobile = viewport === "mobile";
  return (
    <LearningSceneCanvas
      camera={{
        fov: mobile ? 48 : 42,
        position: mobile ? [0, 0, 13] : [0, 0.8, 11],
      }}
      onContextCreated={onContextCreated}
      onContextDisposed={onContextDisposed}
      onContextLost={onContextLost}
      onContextRestored={onContextRestored}
      sceneId={sceneId}
      viewport={viewport}
    >
      <EmbeddingGeometry
        mobile={mobile}
        onFrame={onFrame}
        reducedMotion={reducedMotion}
        state={state}
      />
    </LearningSceneCanvas>
  );
}
