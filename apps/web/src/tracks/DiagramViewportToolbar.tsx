import type { KeyboardEvent, ReactElement } from "react";

type DiagramViewportToolbarProps = Readonly<{
  zoomRatio: number;
  isFit: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFit: () => void;
}>;

export function DiagramViewportToolbar({
  zoomRatio,
  isFit,
  onKeyDown,
  onZoomOut,
  onZoomIn,
  onFit,
}: DiagramViewportToolbarProps): ReactElement {
  return (
    <div
      className="diagram-viewport__toolbar"
      role="toolbar"
      aria-label="다이어그램 보기 도구"
      onKeyDown={onKeyDown}
    >
      <div className="diagram-viewport__zoom-controls">
        <button
          type="button"
          aria-label="축소"
          disabled={isFit}
          onClick={onZoomOut}
        >
          −
        </button>
        <output aria-label="현재 확대 비율">
          {Math.round(zoomRatio * 100)}%
        </output>
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
