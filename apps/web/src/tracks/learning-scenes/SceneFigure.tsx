import {
  Component,
  type ComponentType,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { supportsLearningSceneWebGL } from "./sceneCapabilities";
import {
  recordSceneContextCreated,
  recordSceneContextDisposed,
  recordSceneContextLost,
  recordSceneContextRestored,
  recordSceneFrame,
} from "./sceneInstrumentation";
import type {
  LearningSceneModule,
  LearningSceneRendererProps,
  LearningSceneViewport,
} from "./sceneTypes";
import {
  useReducedSceneMotion,
  useSceneViewport,
  useSceneVisibility,
} from "./useSceneEnvironment";

import "./sceneFigure.css";

type SceneFigureProps<State extends object> = Readonly<{
  aspectRatio: number;
  annotations?: ReactNode;
  controls: ReactNode;
  description: string;
  fallback: ReactNode;
  figureId: string;
  loadScene: () => Promise<LearningSceneModule<State>>;
  state: State;
  title: string;
  webglCapability?: () => boolean;
}>;

type SceneBoundaryProps = Readonly<{
  children: ReactNode;
  fallback: ReactNode;
}>;

type SceneFigureStyle = CSSProperties & {
  readonly "--scene-aspect-ratio": number;
};

class SceneBoundary extends Component<
  SceneBoundaryProps,
  Readonly<{ failed: boolean }>
> {
  override state = { failed: false };

  static getDerivedStateFromError(): Readonly<{ failed: boolean }> {
    return { failed: true };
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function SceneFigure<State extends object>({
  aspectRatio,
  annotations,
  controls,
  description,
  fallback,
  figureId,
  loadScene,
  state,
  title,
  webglCapability = supportsLearningSceneWebGL,
}: SceneFigureProps<State>): ReactElement {
  const hostRef = useRef<HTMLElement>(null);
  const { nearby, visible } = useSceneVisibility(hostRef, figureId);
  const viewport = useSceneViewport(hostRef);
  const reducedMotion = useReducedSceneMotion();
  const [renderer, setRenderer] =
    useState<ComponentType<LearningSceneRendererProps<State>>>();
  const [loadState, setLoadState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [webgl, setWebgl] = useState<"unknown" | "available" | "unavailable">(
    "unknown",
  );
  const [contextLost, setContextLost] = useState(false);
  const [readyViewport, setReadyViewport] =
    useState<LearningSceneViewport | null>(null);
  const loadStarted = useRef(false);

  useEffect(() => {
    if (!nearby || webgl !== "unknown") return;
    setWebgl(webglCapability() ? "available" : "unavailable");
  }, [nearby, webgl, webglCapability]);

  useEffect(() => {
    if (!nearby || webgl !== "available" || loadStarted.current) return;
    loadStarted.current = true;
    let current = true;
    setLoadState("loading");
    void loadScene()
      .then((module) => {
        if (!current) return;
        setRenderer(() => module.default);
        setLoadState("ready");
      })
      .catch(() => {
        if (current) setLoadState("error");
      });
    return () => {
      current = false;
    };
  }, [loadScene, nearby, webgl]);

  const onContextCreated = useCallback(() => {
    recordSceneContextCreated();
    setReadyViewport(viewport);
  }, [viewport]);
  const onContextDisposed = useCallback(() => {
    recordSceneContextDisposed();
    setReadyViewport(null);
  }, []);
  const onContextLost = useCallback(() => {
    recordSceneContextLost();
    setContextLost(true);
  }, []);
  const onContextRestored = useCallback(() => {
    recordSceneContextRestored();
    setContextLost(false);
  }, []);
  const onFrame = useCallback(recordSceneFrame, []);
  const SceneRenderer = renderer;
  const canRender =
    visible &&
    webgl === "available" &&
    loadState === "ready" &&
    SceneRenderer !== undefined;
  const sceneReady = canRender && readyViewport === viewport;
  const status = contextLost
    ? "context-lost"
    : webgl === "unavailable"
      ? "unavailable"
      : loadState === "error"
        ? "error"
        : sceneReady
          ? "ready"
          : canRender
            ? "initializing"
            : loadState === "loading"
              ? "loading"
              : "static";

  const style: SceneFigureStyle = {
    "--scene-aspect-ratio": aspectRatio,
  };

  return (
    <section
      ref={hostRef as RefObject<HTMLElement>}
      className="scene-figure"
      aria-labelledby={`${figureId}-scene-title`}
      aria-describedby={`${figureId}-scene-description`}
      data-scene-id={figureId}
      data-scene-motion={reducedMotion ? "reduced" : "full"}
      data-scene-status={status}
      data-scene-viewport={viewport}
      data-scene-visible={visible ? "true" : "false"}
      style={style}
    >
      <header className="scene-figure__header">
        <h3 id={`${figureId}-scene-title`}>{title}</h3>
        <span id={`${figureId}-scene-description`}>{description}</span>
      </header>
      <fieldset
        className="scene-figure__controls"
        aria-label={`${title} controls`}
      >
        {controls}
      </fieldset>
      {annotations === undefined ? null : (
        <div className="scene-figure__annotations">{annotations}</div>
      )}
      <div className="scene-figure__plane">
        {canRender && SceneRenderer !== undefined ? (
          <SceneBoundary
            fallback={
              <div className="scene-figure__fallback">
                {fallback}
                <p className="scene-figure__status">
                  Interactive scene 오류로 정적 설명을 표시합니다.
                </p>
              </div>
            }
          >
            <SceneRenderer
              onContextCreated={onContextCreated}
              onContextDisposed={onContextDisposed}
              onContextLost={onContextLost}
              onContextRestored={onContextRestored}
              onFrame={onFrame}
              reducedMotion={reducedMotion}
              sceneId={figureId}
              state={state}
              viewport={viewport}
            />
          </SceneBoundary>
        ) : null}
        <div
          className={
            sceneReady && !contextLost
              ? "scene-figure__fallback scene-figure__fallback--semantic"
              : canRender
                ? "scene-figure__fallback scene-figure__fallback--overlay"
                : "scene-figure__fallback"
          }
        >
          {fallback}
        </div>
        {status === "loading" ? (
          <p className="scene-figure__status">시각화를 준비하고 있습니다.</p>
        ) : null}
        {status === "initializing" ? (
          <p className="scene-figure__status">
            3D scene을 초기화하고 있습니다.
          </p>
        ) : null}
        {status === "unavailable" ? (
          <p className="scene-figure__status">
            Interactive scene을 사용할 수 없어 정적 설명을 표시합니다.
          </p>
        ) : null}
        {status === "error" ? (
          <p className="scene-figure__status">
            Interactive scene 오류로 정적 설명을 표시합니다.
          </p>
        ) : null}
        {status === "context-lost" ? (
          <p className="scene-figure__status">
            WebGL context를 복구하고 있습니다.
          </p>
        ) : null}
      </div>
    </section>
  );
}
