import { useCallback, useRef } from "react";
import type { Group } from "three";

import { LearningSceneCanvas } from "../LearningSceneCanvas";
import { ContextRibbon } from "../part1/part1ScenePrimitives";
import { LEARNING_SCENE_COLORS } from "../scenePalette";
import {
  FlowLine,
  LayerPlane,
  TokenChip,
  VectorStrip,
} from "../scenePrimitives";
import type { LearningSceneRendererProps } from "../sceneTypes";
import { useDemandTransition } from "../useDemandTransition";
import type { GptArchitectureState } from "./GptArchitectureSceneFigure";

const TOKEN_VECTOR = [
  { id: "token-0", value: -0.55 },
  { id: "token-1", value: 0.32 },
  { id: "token-2", value: 0.74 },
  { id: "token-3", value: -0.18 },
] as const;
const POSITION_VECTOR = [
  { id: "position-0", value: 0.22 },
  { id: "position-1", value: -0.48 },
  { id: "position-2", value: 0.28 },
  { id: "position-3", value: 0.56 },
] as const;
const STAGE_INDEX: Readonly<Record<GptArchitectureState["stage"], number>> = {
  input: 0,
  embedding: 1,
  blocks: 2,
  output: 3,
  generation: 4,
};

function GptPipeline({
  mobile,
  onFrame,
  reducedMotion,
  state,
}: Readonly<{
  mobile: boolean;
  onFrame: () => void;
  reducedMotion: boolean;
  state: GptArchitectureState;
}>) {
  const input = useRef<Group>(null);
  const embedding = useRef<Group>(null);
  const blocks = useRef<Group>(null);
  const output = useRef<Group>(null);
  const generation = useRef<Group>(null);
  const groups = [input, embedding, blocks, output, generation] as const;
  const active = STAGE_INDEX[state.stage];
  const apply = useCallback(
    (progress: number) => {
      groups.forEach((group, index) => {
        if (group.current === null) return;
        group.current.scale.setScalar(
          1 + (index === active ? 0.08 * progress : 0),
        );
        group.current.position.z = index === active ? 0.32 * progress : 0;
      });
    },
    [active, groups],
  );
  useDemandTransition({
    apply,
    duration: 0.56,
    onFrame,
    reducedMotion,
    transitionKey: `${state.stage}-${state.replay}`,
  });

  const positions = mobile
    ? {
        input: [0, 4.5, 0] as const,
        embedding: [0, 2.3, 0] as const,
        blocks: [0, 0, 0] as const,
        output: [0, -2.2, 0] as const,
        generation: [0, -4.35, 0] as const,
      }
    : {
        input: [-4.65, 1.15, 0] as const,
        embedding: [-2.35, 1.15, 0] as const,
        blocks: [0.2, 1.15, 0] as const,
        output: [2.55, 1.15, 0] as const,
        generation: [4.55, 1.15, 0] as const,
      };
  const blockIds = Array.from(
    { length: state.layerCount },
    (_, index) => `block-${index + 1}`,
  );
  const links = [
    { from: positions.input, id: "input-embedding", to: positions.embedding },
    { from: positions.embedding, id: "embedding-blocks", to: positions.blocks },
    { from: positions.blocks, id: "blocks-output", to: positions.output },
    {
      from: positions.output,
      id: "output-generation",
      to: positions.generation,
    },
  ] as const;

  return (
    <group>
      <group ref={input}>
        <ContextRibbon
          position={positions.input}
          selected={state.stage === "input"}
          tokens={["The", "cat"]}
        />
      </group>
      <group ref={embedding} position={positions.embedding}>
        <VectorStrip
          color={LEARNING_SCENE_COLORS.token}
          position={[0, 0.48, 0.34]}
          values={TOKEN_VECTOR}
        />
        <VectorStrip
          color={LEARNING_SCENE_COLORS.position}
          position={[0, -0.48, -0.34]}
          values={POSITION_VECTOR}
        />
        <FlowLine
          color={LEARNING_SCENE_COLORS.output}
          position={[0, -0.95, 0]}
          rotation={[0, 0, 0]}
          scale={0.72}
        />
      </group>
      <group ref={blocks} position={positions.blocks}>
        {blockIds.map((blockId, index) => (
          <LayerPlane
            key={blockId}
            color={
              index === blockIds.length - 1
                ? LEARNING_SCENE_COLORS.selected
                : LEARNING_SCENE_COLORS.graphite
            }
            opacity={0.54 + index * 0.12}
            position={[index * 0.12, index * -0.1, index * -0.34]}
            size={[1.8, 2.2]}
          />
        ))}
      </group>
      <group ref={output} position={positions.output}>
        {["norm", "head", "logits"].map((stage, index) => (
          <mesh key={stage} position={[0, 0.78 - index * 0.78, index * 0.12]}>
            <boxGeometry args={[1.75 - index * 0.16, 0.54, 0.18]} />
            <meshStandardMaterial
              color={
                index === 2
                  ? LEARNING_SCENE_COLORS.output
                  : LEARNING_SCENE_COLORS.neutral
              }
              metalness={0.01}
              roughness={0.84}
            />
          </mesh>
        ))}
      </group>
      <group ref={generation}>
        <TokenChip
          color={LEARNING_SCENE_COLORS.output}
          position={positions.generation}
          scale={0.7}
          selected={state.stage === "generation"}
        />
        <ContextRibbon
          color={LEARNING_SCENE_COLORS.output}
          position={
            mobile ? ([0, -5.8, 0] as const) : ([2.8, -1.7, 0] as const)
          }
          selected={state.stage === "generation"}
          tokens={["The", "cat", "s"]}
        />
      </group>
      {links.map(({ from, id, to }) => (
        <FlowLine
          key={id}
          color={LEARNING_SCENE_COLORS.graphite}
          position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, -0.18]}
          rotation={mobile ? [0, 0, 0] : [0, 0, Math.PI / 2]}
          scale={0.9}
        />
      ))}
      {mobile ? (
        <FlowLine
          color={LEARNING_SCENE_COLORS.residual}
          length={13}
          position={[3.2, 4.35, -0.4]}
          rotation={[0, 0, Math.PI]}
        />
      ) : (
        <>
          <FlowLine
            color={LEARNING_SCENE_COLORS.residual}
            length={11}
            position={[-4.45, -1.7, -0.4]}
            rotation={[0, 0, -Math.PI / 2]}
          />
          <FlowLine
            color={LEARNING_SCENE_COLORS.residual}
            length={4.2}
            position={[-4.65, 1, -0.4]}
            rotation={[0, 0, Math.PI]}
          />
        </>
      )}
    </group>
  );
}

export default function GptArchitectureScene({
  onContextCreated,
  onContextDisposed,
  onContextLost,
  onContextRestored,
  onFrame,
  reducedMotion,
  sceneId,
  state,
  viewport,
}: LearningSceneRendererProps<GptArchitectureState>) {
  const mobile = viewport === "mobile";
  return (
    <LearningSceneCanvas
      camera={{
        fov: mobile ? 48 : 42,
        position: mobile ? [0, 0, 16] : [0, 0.8, 12],
      }}
      onContextCreated={onContextCreated}
      onContextDisposed={onContextDisposed}
      onContextLost={onContextLost}
      onContextRestored={onContextRestored}
      sceneId={sceneId}
      viewport={viewport}
    >
      <GptPipeline
        mobile={mobile}
        onFrame={onFrame}
        reducedMotion={reducedMotion}
        state={state}
      />
    </LearningSceneCanvas>
  );
}
