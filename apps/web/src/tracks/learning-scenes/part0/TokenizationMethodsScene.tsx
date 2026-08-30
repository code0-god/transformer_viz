import { LearningSceneCanvas } from "../LearningSceneCanvas";
import { LEARNING_SCENE_COLORS } from "../scenePalette";
import { LayerPlane } from "../scenePrimitives";
import type { LearningSceneRendererProps } from "../sceneTypes";
import type { TokenizationMethodsState } from "./Part0SceneFigures";
import { TOKENIZATION_SEGMENTS } from "./part0SceneData";
import { SegmentationStrip } from "./part0ScenePrimitives";

export default function TokenizationMethodsScene({
  onContextCreated,
  onContextDisposed,
  onContextLost,
  onContextRestored,
  onFrame,
  reducedMotion,
  sceneId,
  state,
  viewport,
}: LearningSceneRendererProps<TokenizationMethodsState>) {
  const mobile = viewport === "mobile";
  return (
    <LearningSceneCanvas
      camera={{
        fov: mobile ? 49 : 40,
        position: mobile ? [0, 0, 11.5] : [0, 0.65, 7.2],
      }}
      onContextCreated={onContextCreated}
      onContextDisposed={onContextDisposed}
      onContextLost={onContextLost}
      onContextRestored={onContextRestored}
      sceneId={sceneId}
      viewport={viewport}
    >
      <LayerPlane
        color={LEARNING_SCENE_COLORS.stageDepth}
        opacity={0.48}
        position={[0, 0, -0.28]}
        size={[mobile ? 7.4 : 8.5, 2.4]}
      />
      <SegmentationStrip
        color={
          state.method === "byte"
            ? LEARNING_SCENE_COLORS.selected
            : LEARNING_SCENE_COLORS.token
        }
        mobile={mobile}
        onFrame={onFrame}
        reducedMotion={reducedMotion}
        segments={TOKENIZATION_SEGMENTS[state.method]}
        split={state.phase === "split"}
        transitionKey={`${state.method}-${state.phase}-${state.replay}`}
      />
    </LearningSceneCanvas>
  );
}
