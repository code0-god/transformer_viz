import type { ReactElement, ReactNode } from "react";

type DiagramViewportToolbarProps = Readonly<{
  scale: number;
  isFit: boolean;
  extraControls?: ReactNode;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFit: () => void;
}>;

export function DiagramViewportToolbar({
  scale,
  isFit,
  extraControls,
  onZoomOut,
  onZoomIn,
  onFit,
}: DiagramViewportToolbarProps): ReactElement {
  return (
    <div
      className="diagram-viewport__toolbar"
      role="toolbar"
      aria-label="다이어그램 보기 도구"
    >
      {extraControls === undefined ? null : (
        <div className="diagram-viewport__extra-controls">{extraControls}</div>
      )}
      <div className="diagram-viewport__zoom-controls">
        <button
          type="button"
          aria-label="축소"
          disabled={isFit}
          onClick={onZoomOut}
        >
          −
        </button>
        <output aria-label="현재 확대 비율">{Math.round(scale * 100)}%</output>
        <button type="button" aria-label="확대" onClick={onZoomIn}>
          +
        </button>
        <button
          type="button"
          aria-label="전체 보기"
          disabled={isFit}
          onClick={onFit}
        >
          Fit
        </button>
      </div>
    </div>
  );
}
