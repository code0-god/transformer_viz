import {
  type ReactElement,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { DiagramViewportToolbar } from "./DiagramViewportToolbar";
import {
  calculateFitTransform,
  calculateZoomTransform,
  clampPan,
  type DiagramDrag,
  type DiagramGeometry,
  type DiagramPoint,
  type DiagramTransform,
  diagramGeometriesEqual,
  diagramTransformsEqual,
} from "./diagramViewportTransform";
import { observeDiagramResize } from "./observeDiagramResize";
import "./diagramViewport.css";

const ZOOM_STEP = 1.2;
const DRAG_THRESHOLD = 4;
const SCALE_EPSILON = 0.000_001;

export type DiagramViewportProps = {
  readonly label: string;
  readonly resetKey: string | number;
  readonly description?: ReactNode;
  readonly extraControls?: ReactNode;
  readonly children: ReactNode;
};

export function DiagramViewport({
  label,
  resetKey,
  description,
  extraControls,
  children,
}: DiagramViewportProps): ReactElement {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const geometryRef = useRef<DiagramGeometry>(null);
  const remeasuredContentRef = useRef<DiagramGeometry["content"] | null>(null);
  const dragRef = useRef<DiagramDrag>(null);
  const [geometry, setGeometry] = useState<DiagramGeometry | null>(null);
  const [transform, setTransform] = useState<DiagramTransform | null>(null);
  const [dragging, setDragging] = useState(false);

  const refit = useCallback((): void => {
    const viewportElement = viewportRef.current;
    const contentElement = contentRef.current;
    if (viewportElement === null || contentElement === null) return;

    const viewportRect = viewportElement.getBoundingClientRect();
    let contentWidth = contentElement.scrollWidth;
    let contentHeight = contentElement.scrollHeight;
    const diagramSvg = contentElement.querySelector("svg[viewBox]");
    if (diagramSvg instanceof SVGSVGElement) {
      const viewBox = diagramSvg
        .getAttribute("viewBox")
        ?.trim()
        .split(/[\s,]+/)
        .map(Number);
      const width = viewBox?.[2];
      const height = viewBox?.[3];
      if (
        width !== undefined &&
        height !== undefined &&
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        width > 0 &&
        height > 0
      ) {
        contentWidth = width;
        contentHeight = height;
      }
    }
    if (
      viewportRect.width <= 0 ||
      viewportRect.height <= 0 ||
      contentWidth <= 0 ||
      contentHeight <= 0
    )
      return;

    const viewportSize = {
      width:
        viewportElement.clientWidth > 0
          ? viewportElement.clientWidth
          : viewportRect.width,
      height:
        viewportElement.clientHeight > 0
          ? viewportElement.clientHeight
          : viewportRect.height,
    };
    const contentSize = { width: contentWidth, height: contentHeight };
    const nextGeometry = {
      viewport: viewportSize,
      content: contentSize,
      fit: calculateFitTransform(viewportSize, contentSize),
    };
    geometryRef.current = nextGeometry;
    dragRef.current = null;
    setDragging(false);
    setGeometry((current) => {
      return current !== null && diagramGeometriesEqual(current, nextGeometry)
        ? current
        : nextGeometry;
    });
    setTransform((current) => {
      if (
        current !== null &&
        diagramTransformsEqual(current, nextGeometry.fit)
      ) {
        return current;
      }
      return nextGeometry.fit;
    });
  }, []);

  useLayoutEffect(() => {
    const viewportElement = viewportRef.current;
    const contentElement = contentRef.current;
    if (contentElement?.getAttribute("data-reset-key") !== String(resetKey))
      return;
    remeasuredContentRef.current = null;
    refit();
    return observeDiagramResize(viewportElement, contentElement, refit);
  }, [refit, resetKey]);

  useLayoutEffect(() => {
    if (
      geometry?.content === undefined ||
      remeasuredContentRef.current === geometry.content
    )
      return;
    remeasuredContentRef.current = geometry.content;
    refit();
  }, [geometry, refit]);

  const applyZoom = useCallback(
    (requestedScale: number, point?: DiagramPoint): void => {
      const currentGeometry = geometryRef.current;
      if (currentGeometry === null) return;
      setTransform((current) =>
        current === null
          ? currentGeometry.fit
          : calculateZoomTransform(current, currentGeometry, {
              scale: requestedScale,
              point,
            }),
      );
    },
    [],
  );

  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (viewportElement === null || transform === null) return;
    const handleWheel = (event: WheelEvent): void => {
      if (!event.ctrlKey) return;
      if (
        event.target instanceof Element &&
        event.target.closest(".diagram-viewport__toolbar") !== null
      )
        return;
      event.preventDefault();
      const rect = viewportElement.getBoundingClientRect();
      applyZoom(
        transform.scale * (event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP),
        { x: event.clientX - rect.left, y: event.clientY - rect.top },
      );
    };
    viewportElement.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewportElement.removeEventListener("wheel", handleWheel);
  }, [applyZoom, transform]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    const currentGeometry = geometryRef.current;
    if (
      (event.target instanceof Element &&
        event.target.closest(".diagram-viewport__toolbar") !== null) ||
      transform === null ||
      currentGeometry === null ||
      transform.scale <= currentGeometry.fit.scale + SCALE_EPSILON
    )
      return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: transform,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    const currentGeometry = geometryRef.current;
    if (
      drag === null ||
      currentGeometry === null ||
      drag.pointerId !== event.pointerId
    )
      return;
    const x = event.clientX - drag.start.x;
    const y = event.clientY - drag.start.y;
    if (!dragging && Math.hypot(x, y) < DRAG_THRESHOLD) return;
    setDragging(true);
    setTransform(
      clampPan(
        {
          scale: drag.origin.scale,
          x: drag.origin.x + x,
          y: drag.origin.y + y,
        },
        currentGeometry.viewport,
        currentGeometry.content,
      ),
    );
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setDragging(false);
  }

  const fitScale = geometry?.fit.scale ?? 1;
  const currentTransform = transform ?? { scale: fitScale, x: 0, y: 0 };
  const isFit = currentTransform.scale <= fitScale + SCALE_EPSILON;
  const zoomRatio =
    fitScale <= SCALE_EPSILON ? 1 : currentTransform.scale / fitScale;
  const hasMetadata = description !== undefined || extraControls !== undefined;

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    switch (event.key) {
      case "+":
      case "=":
        event.preventDefault();
        applyZoom(currentTransform.scale * ZOOM_STEP);
        break;
      case "-":
      case "_":
        event.preventDefault();
        applyZoom(currentTransform.scale / ZOOM_STEP);
        break;
      case "f":
      case "F":
      case "0":
        event.preventDefault();
        refit();
        break;
    }
  }

  return (
    <section className="diagram-viewport" aria-label={label}>
      {hasMetadata ? (
        <div className="diagram-viewport__meta">
          {extraControls === undefined ? null : (
            <div className="diagram-viewport__extra-controls">
              {extraControls}
            </div>
          )}
          {description === undefined ? null : (
            <div className="diagram-viewport__description">{description}</div>
          )}
        </div>
      ) : null}
      <div
        ref={viewportRef}
        className="diagram-viewport__surface"
        data-testid="diagram-viewport-surface"
        data-viewport-mode={isFit ? "fit" : "zoomed"}
        data-dragging={dragging}
        data-fit-scale={fitScale}
        data-scale={currentTransform.scale}
        data-pan-x={currentTransform.x}
        data-pan-y={currentTransform.y}
        data-content-width={geometry?.content.width ?? 0}
        data-content-height={geometry?.content.height ?? 0}
        data-zoom-ratio={zoomRatio}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <DiagramViewportToolbar
          zoomRatio={zoomRatio}
          isFit={isFit}
          onKeyDown={handleKeyDown}
          onZoomOut={() => applyZoom(currentTransform.scale / ZOOM_STEP)}
          onZoomIn={() => applyZoom(currentTransform.scale * ZOOM_STEP)}
          onFit={refit}
        />
        <div
          ref={contentRef}
          className="diagram-viewport__content"
          data-reset-key={resetKey}
          style={{
            width:
              geometry === null ? undefined : `${geometry.content.width}px`,
            height:
              geometry === null ? undefined : `${geometry.content.height}px`,
            transform: `translate(${currentTransform.x}px, ${currentTransform.y}px) scale(${currentTransform.scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
