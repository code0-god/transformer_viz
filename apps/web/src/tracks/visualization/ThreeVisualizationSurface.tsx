import {
  Component,
  type ComponentType,
  type ErrorInfo,
  lazy,
  type ReactElement,
  type ReactNode,
  Suspense,
  useId,
  useState,
} from "react";

export type ThreeVisualizationRendererProps<
  Props extends object = Record<never, never>,
> = Readonly<
  Props & {
    onContextLost: () => void;
    onContextRestored: () => void;
    reducedMotion: boolean;
  }
>;

type RendererModule<Props extends object> = Readonly<{
  default: ComponentType<ThreeVisualizationRendererProps<Props>>;
}>;

type ThreeVisualizationSurfaceProps<Props extends object> = Readonly<{
  title: string;
  loadRenderer: () => Promise<RendererModule<Props>>;
  rendererProps: Props;
  fallback: ReactNode;
  fallbackLabel?: string;
  isWebGLAvailable?: () => boolean;
  prefersReducedMotion?: () => boolean;
}>;

type LocalErrorBoundaryProps = Readonly<{
  children: ReactNode;
  fallback: ReactNode;
  onError: () => void;
}>;

type LocalErrorBoundaryState = Readonly<{
  failed: boolean;
}>;

class LocalErrorBoundary extends Component<
  LocalErrorBoundaryProps,
  LocalErrorBoundaryState
> {
  override state: LocalErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): LocalErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    this.props.onError();
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function browserSupportsWebGL(): boolean {
  if (
    typeof WebGLRenderingContext === "undefined" &&
    typeof WebGL2RenderingContext === "undefined"
  )
    return false;
  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    if (context === null) return false;
    if ("getExtension" in context)
      context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function browserPrefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function ThreeVisualizationSurface<Props extends object>({
  title,
  loadRenderer,
  rendererProps,
  fallback,
  fallbackLabel = "2D 데이터 보기",
  isWebGLAvailable = browserSupportsWebGL,
  prefersReducedMotion = browserPrefersReducedMotion,
}: ThreeVisualizationSurfaceProps<Props>): ReactElement {
  const titleId = useId();
  const [contextLost, setContextLost] = useState(false);
  const [rendererFailed, setRendererFailed] = useState(false);
  const [rendererAttempt, setRendererAttempt] = useState(0);
  const [Renderer, setRenderer] = useState(() => lazy(loadRenderer));
  const [available] = useState(() => isWebGLAvailable());
  const [reducedMotion] = useState(() => prefersReducedMotion());
  const restartRenderer = (): void => {
    setContextLost(false);
    setRendererFailed(false);
    setRendererAttempt((attempt) => attempt + 1);
    setRenderer(lazy(loadRenderer));
  };
  const requiresRecovery = contextLost || rendererFailed;

  return (
    <section
      className="three-visualization-surface"
      aria-labelledby={titleId}
      data-webgl-available={available}
      data-reduced-motion={reducedMotion}
    >
      <h3 id={titleId}>{title}</h3>
      {!available ? (
        <p role="status" data-visualization-state="unavailable">
          이 환경에서는 3D 시각화를 사용할 수 없습니다.
        </p>
      ) : reducedMotion ? (
        <p role="status" data-visualization-state="reduced-motion">
          움직임 줄이기 설정에 따라 정적 데이터를 표시합니다.
        </p>
      ) : (
        <LocalErrorBoundary
          key={rendererAttempt}
          onError={() => setRendererFailed(true)}
          fallback={
            <p role="alert" data-visualization-state="error">
              3D 시각화를 표시할 수 없습니다.
            </p>
          }
        >
          <Suspense
            fallback={
              <p role="status" data-visualization-state="loading">
                시각화를 불러오는 중…
              </p>
            }
          >
            <Renderer
              {...rendererProps}
              onContextLost={() => setContextLost(true)}
              onContextRestored={() => setContextLost(false)}
              reducedMotion={reducedMotion}
            />
          </Suspense>
        </LocalErrorBoundary>
      )}
      {contextLost ? (
        <p role="alert" data-visualization-state="context-lost">
          3D 컨텍스트가 중단되었습니다. 복구를 기다리는 중입니다.
        </p>
      ) : null}
      {requiresRecovery ? (
        <button
          className="three-visualization-surface__retry"
          type="button"
          onClick={restartRenderer}
        >
          3D 시각화 다시 시작
        </button>
      ) : null}
      <details
        className="three-visualization-surface__fallback"
        open={!available || reducedMotion || requiresRecovery || undefined}
      >
        <summary>{fallbackLabel}</summary>
        {fallback}
      </details>
    </section>
  );
}
