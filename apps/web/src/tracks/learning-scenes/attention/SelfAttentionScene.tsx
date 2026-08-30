import { useCallback, useRef } from "react";
import type { Group } from "three";

import { LearningSceneCanvas } from "../LearningSceneCanvas";
import { ContextRibbon } from "../part1/part1ScenePrimitives";
import { LEARNING_SCENE_COLORS } from "../scenePalette";
import {
  FlowLine,
  MatrixPlane,
  SelectionFrame,
  VectorStrip,
} from "../scenePrimitives";
import type { LearningSceneRendererProps } from "../sceneTypes";
import { useDemandTransition } from "../useDemandTransition";
import type {
  SelfAttentionStage,
  SelfAttentionState,
} from "./SelfAttentionSceneFigure";

const RAW_SCORES = [
  0.72, -0.44, 0.31, -0.62, 0.18, 0.83, -0.27, 0.46, -0.35, 0.58, 0.91, -0.16,
  0.22, -0.49, 0.67, 0.78,
] as const;
const WEIGHTS = [
  1, 0, 0, 0, 0.34, 0.66, 0, 0, 0.18, 0.29, 0.53, 0, 0.12, 0.18, 0.31, 0.39,
] as const;
const SCORE_CELLS = RAW_SCORES.map((value, index) => ({
  col: index % 4,
  id: `score-${Math.floor(index / 4)}-${index % 4}`,
  row: Math.floor(index / 4),
  value,
}));
const WEIGHT_CELLS = WEIGHTS.map((value, index) => ({
  col: index % 4,
  id: `weight-${Math.floor(index / 4)}-${index % 4}`,
  row: Math.floor(index / 4),
  value,
}));
const Q_VALUES = [
  { id: "q-0", value: 0.62 },
  { id: "q-1", value: -0.38 },
  { id: "q-2", value: 0.82 },
  { id: "q-3", value: 0.17 },
] as const;
const K_VALUES = [
  { id: "k-0", value: -0.44 },
  { id: "k-1", value: 0.73 },
  { id: "k-2", value: 0.26 },
  { id: "k-3", value: -0.61 },
] as const;
const V_VALUES = [
  { id: "v-0", value: 0.31 },
  { id: "v-1", value: -0.72 },
  { id: "v-2", value: 0.55 },
  { id: "v-3", value: 0.84 },
] as const;

const FOCUS_INDEX: Readonly<Record<SelfAttentionStage, number>> = {
  overview: -1,
  qkv: 1,
  scores: 2,
  mask: 2,
  softmax: 3,
  value: 4,
};

function AttentionPipeline({
  mobile,
  onFrame,
  reducedMotion,
  state,
}: Readonly<{
  mobile: boolean;
  onFrame: () => void;
  reducedMotion: boolean;
  state: SelfAttentionState;
}>) {
  const input = useRef<Group>(null);
  const qkv = useRef<Group>(null);
  const scores = useRef<Group>(null);
  const weights = useRef<Group>(null);
  const value = useRef<Group>(null);
  const groups = [input, qkv, scores, weights, value] as const;
  const focus = FOCUS_INDEX[state.stage];
  const apply = useCallback(
    (progress: number) => {
      groups.forEach((group, index) => {
        if (group.current === null) return;
        const active = focus === -1 || focus === index;
        group.current.position.z = active ? 0.3 * progress : -0.18;
        group.current.scale.setScalar(
          1 + (focus === index ? 0.06 * progress : 0),
        );
      });
      if (!mobile && input.current !== null) {
        input.current.position.x = state.stage === "qkv" ? 1.2 * progress : 0;
      }
      if (qkv.current !== null) {
        qkv.current.position.x =
          mobile || state.stage !== "qkv"
            ? mobile
              ? 0
              : -3.2
            : -3.2 + 3.2 * progress;
        if (state.stage === "qkv") {
          qkv.current.scale.setScalar(1 + 0.42 * progress);
        }
      }
    },
    [focus, groups, mobile, state.stage],
  );
  useDemandTransition({
    apply,
    duration: 0.58,
    onFrame,
    reducedMotion,
    transitionKey: `${state.stage}-${state.replay}`,
  });

  const positions = mobile
    ? {
        input: [0, 5.25, 0] as const,
        qkv: [0, 3.35, 0] as const,
        scores: [0, 0.8, 0] as const,
        weights: [0, -2.2, 0] as const,
        value: [0, -4.85, 0] as const,
      }
    : {
        input: [-5.2, 0, 0] as const,
        qkv: [-3.2, 0, 0] as const,
        scores: [-0.65, 0, 0] as const,
        weights: [2, 0, 0] as const,
        value: [4.55, 0, 0] as const,
      };
  const maskApplied = ["mask", "softmax", "value"].includes(state.stage);

  return (
    <group>
      <group ref={input}>
        <ContextRibbon
          position={positions.input}
          selected={state.stage === "overview"}
          tokens={["The", "cat", "sat", "."]}
        />
      </group>
      <group ref={qkv} position={positions.qkv}>
        <VectorStrip
          color={LEARNING_SCENE_COLORS.query}
          position={[0, 1.05, 0.34]}
          values={Q_VALUES}
        />
        <VectorStrip
          color={LEARNING_SCENE_COLORS.key}
          position={[0, 0, 0]}
          values={K_VALUES}
        />
        <VectorStrip
          color={LEARNING_SCENE_COLORS.value}
          position={[0, -1.05, -0.34]}
          values={V_VALUES}
        />
      </group>
      <group
        ref={scores}
        position={positions.scores}
        visible={state.stage !== "qkv"}
      >
        <MatrixPlane
          cells={SCORE_CELLS.map((cell) => ({
            ...cell,
            masked: maskApplied && cell.col > cell.row,
          }))}
          cols={4}
          mode="score"
          position={[0, 0, 0]}
        />
        {state.stage === "mask" ? (
          <SelectionFrame
            color={LEARNING_SCENE_COLORS.masked}
            position={[0.42, 0.42, 0.38]}
            size={[1.45, 1.45, 0.18]}
          />
        ) : null}
      </group>
      <group
        ref={weights}
        position={positions.weights}
        visible={
          state.stage === "overview" ||
          state.stage === "softmax" ||
          state.stage === "value"
        }
      >
        <MatrixPlane
          cells={WEIGHT_CELLS.map((cell) => ({
            ...cell,
            masked: cell.col > cell.row,
          }))}
          cols={4}
          mode="weight"
          position={[0, 0, 0]}
        />
      </group>
      <group
        ref={value}
        position={positions.value}
        visible={state.stage === "overview" || state.stage === "value"}
      >
        {[-0.92, 0, 0.92].map((y, index) => (
          <VectorStrip
            key={y}
            color={LEARNING_SCENE_COLORS.value}
            position={
              mobile
                ? [index * 0.2 - 0.2, y, index * -0.18]
                : [0, y, index * -0.18]
            }
            values={V_VALUES}
          />
        ))}
        <FlowLine
          color={LEARNING_SCENE_COLORS.output}
          position={mobile ? [0, -1.75, -0.1] : [1.65, 0, -0.1]}
          rotation={mobile ? [0, 0, 0] : [0, 0, Math.PI / 2]}
        />
        <VectorStrip
          color={LEARNING_SCENE_COLORS.output}
          position={mobile ? [0, -2.55, 0] : [2.75, 0, 0]}
          values={Q_VALUES}
        />
      </group>
      {[
        {
          from: positions.input,
          id: "input-qkv",
          show: state.stage === "overview" || state.stage === "qkv",
          to: positions.qkv,
        },
        {
          from: positions.qkv,
          id: "qkv-scores",
          show:
            state.stage === "overview" ||
            state.stage === "scores" ||
            state.stage === "mask" ||
            state.stage === "softmax",
          to: positions.scores,
        },
        {
          from: positions.scores,
          id: "scores-weights",
          show:
            state.stage === "overview" ||
            state.stage === "softmax" ||
            state.stage === "value",
          to: positions.weights,
        },
        {
          from: positions.weights,
          id: "weights-value",
          show: state.stage === "overview" || state.stage === "value",
          to: positions.value,
        },
      ]
        .filter(({ show }) => show)
        .map(({ from, id, to }) => (
          <FlowLine
            key={id}
            color={LEARNING_SCENE_COLORS.graphite}
            position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, -0.25]}
            rotation={mobile ? [0, 0, 0] : [0, 0, Math.PI / 2]}
            scale={0.8}
          />
        ))}
    </group>
  );
}

export default function SelfAttentionScene({
  onContextCreated,
  onContextDisposed,
  onContextLost,
  onContextRestored,
  onFrame,
  reducedMotion,
  sceneId,
  state,
  viewport,
}: LearningSceneRendererProps<SelfAttentionState>) {
  const mobile = viewport === "mobile";
  return (
    <LearningSceneCanvas
      camera={{
        fov: mobile ? 49 : 42,
        position: mobile ? [0.7, 0.8, 17.5] : [0.9, 1.2, 13.5],
      }}
      onContextCreated={onContextCreated}
      onContextDisposed={onContextDisposed}
      onContextLost={onContextLost}
      onContextRestored={onContextRestored}
      sceneId={sceneId}
      viewport={viewport}
    >
      <AttentionPipeline
        mobile={mobile}
        onFrame={onFrame}
        reducedMotion={reducedMotion}
        state={state}
      />
    </LearningSceneCanvas>
  );
}
