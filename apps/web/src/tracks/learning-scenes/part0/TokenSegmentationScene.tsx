import { LearningSceneCanvas } from "../LearningSceneCanvas";
import { LEARNING_SCENE_COLORS } from "../scenePalette";
import { LayerPlane } from "../scenePrimitives";
import type { LearningSceneRendererProps } from "../sceneTypes";
import type { TokenSegmentationState } from "./Part0SceneFigures";
import { TOKEN_UNIT_EXAMPLES } from "./part0SceneData";
import { SegmentationStrip } from "./part0ScenePrimitives";

export default function TokenSegmentationScene({
  onContextCreated,
  onContextDisposed,
  onContextLost,
  onContextRestored,
  onFrame,
  reducedMotion,
  sceneId,
  state,
  viewport,
}: LearningSceneRendererProps<TokenSegmentationState>) {
  const mobile = viewport === "mobile";
  const example = TOKEN_UNIT_EXAMPLES[state.mode];
  return (
    <LearningSceneCanvas
      camera={{
        fov: mobile ? 48 : 40,
        position: mobile ? [0, 0, 11.5] : [0, 0.7, 7.2],
      }}
      onContextCreated={onContextCreated}
      onContextDisposed={onContextDisposed}
      onContextLost={onContextLost}
      onContextRestored={onContextRestored}
      sceneId={sceneId}
      viewport={viewport}
    >
      {state.narrative === true ? null : (
        <LayerPlane
          color={LEARNING_SCENE_COLORS.stageDepth}
          opacity={0.46}
          position={[0, 0, -0.28]}
          size={[mobile ? 7.3 : 8.4, 2.35]}
        />
      )}
      <SegmentationStrip
        mobile={mobile}
        narrative={state.narrative === true}
        onFrame={onFrame}
        reducedMotion={reducedMotion}
        segments={example.segments}
        split={state.phase === "split"}
        transitionKey={`${state.mode}-${state.phase}-${state.replay}`}
      />
    </LearningSceneCanvas>
  );
}
