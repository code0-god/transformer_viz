export type DiagramSize = {
  readonly width: number;
  readonly height: number;
};

export type DiagramPoint = {
  readonly x: number;
  readonly y: number;
};

export type DiagramTransform = DiagramPoint & {
  readonly scale: number;
};

export type DiagramGeometry = {
  readonly viewport: DiagramSize;
  readonly content: DiagramSize;
  readonly fit: DiagramTransform;
};

export type DiagramDrag = {
  readonly pointerId: number;
  readonly start: DiagramPoint;
  readonly origin: DiagramTransform;
};

type ZoomRequest = {
  readonly scale: number;
  readonly point: DiagramPoint | undefined;
};

const MAX_ZOOM_MULTIPLIER = 4;
const SCALE_EPSILON = 0.000_001;

export function diagramTransformsEqual(
  left: DiagramTransform,
  right: DiagramTransform,
): boolean {
  return (
    Math.abs(left.scale - right.scale) <= SCALE_EPSILON &&
    Math.abs(left.x - right.x) <= SCALE_EPSILON &&
    Math.abs(left.y - right.y) <= SCALE_EPSILON
  );
}

export function diagramGeometriesEqual(
  left: DiagramGeometry,
  right: DiagramGeometry,
): boolean {
  return (
    Math.abs(left.viewport.width - right.viewport.width) <= SCALE_EPSILON &&
    Math.abs(left.viewport.height - right.viewport.height) <= SCALE_EPSILON &&
    Math.abs(left.content.width - right.content.width) <= SCALE_EPSILON &&
    Math.abs(left.content.height - right.content.height) <= SCALE_EPSILON &&
    diagramTransformsEqual(left.fit, right.fit)
  );
}

export function calculateFitTransform(
  viewport: DiagramSize,
  content: DiagramSize,
): DiagramTransform {
  const scale = Math.min(
    viewport.width / content.width,
    viewport.height / content.height,
  );
  return {
    scale,
    x: (viewport.width - content.width * scale) / 2,
    y: (viewport.height - content.height * scale) / 2,
  };
}

export function zoomAtPoint(
  transform: DiagramTransform,
  scale: number,
  point: DiagramPoint,
): DiagramTransform {
  const ratio = scale / transform.scale;
  return {
    scale,
    x: point.x - (point.x - transform.x) * ratio,
    y: point.y - (point.y - transform.y) * ratio,
  };
}

export function calculateZoomTransform(
  current: DiagramTransform,
  geometry: DiagramGeometry,
  request: ZoomRequest,
): DiagramTransform {
  const scale = Math.min(
    geometry.fit.scale * MAX_ZOOM_MULTIPLIER,
    Math.max(geometry.fit.scale, request.scale),
  );
  if (scale <= geometry.fit.scale + SCALE_EPSILON) return geometry.fit;
  return clampPan(
    zoomAtPoint(
      current,
      scale,
      request.point ?? {
        x: geometry.viewport.width / 2,
        y: geometry.viewport.height / 2,
      },
    ),
    geometry.viewport,
    geometry.content,
  );
}

export function clampPan(
  transform: DiagramTransform,
  viewport: DiagramSize,
  content: DiagramSize,
): DiagramTransform {
  const scaledWidth = content.width * transform.scale;
  const scaledHeight = content.height * transform.scale;
  return {
    scale: transform.scale,
    x:
      scaledWidth <= viewport.width
        ? (viewport.width - scaledWidth) / 2
        : Math.min(0, Math.max(viewport.width - scaledWidth, transform.x)),
    y:
      scaledHeight <= viewport.height
        ? (viewport.height - scaledHeight) / 2
        : Math.min(0, Math.max(viewport.height - scaledHeight, transform.y)),
  };
}
