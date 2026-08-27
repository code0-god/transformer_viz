import type {
  ReactElement,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from "react";

import { DiagramViewport } from "./DiagramViewport";
import type { LearningPaneMode } from "./decoder-only-fundamentals/curriculum/paneMode";
import type { LearningFocusStatus } from "./learningFocus";
import type { LearningRouteId } from "./workspaceTypes";
import "./learningWorkspace.css";

export type LearningWorkspaceRoute = {
  readonly id: LearningRouteId;
  readonly title: string;
  readonly subtitle: string;
};

export type LearningWorkspacePane = {
  readonly label: string;
  readonly content: ReactNode;
  readonly resetKey?: string;
};

export type LearningRouteHeaderProps = {
  readonly route: LearningWorkspaceRoute;
  readonly controls?: ReactNode;
  readonly onTitleRef?: (element: HTMLHeadingElement | null) => void;
};

type LearningWorkspaceBaseProps = {
  readonly route: LearningWorkspaceRoute;
  readonly diagram: LearningWorkspacePane;
  readonly guide: LearningWorkspacePane;
  readonly status: LearningFocusStatus;
  readonly headerControls?: ReactNode;
  readonly diagramControls?: ReactNode;
  readonly onRouteTitleRef?: (element: HTMLHeadingElement | null) => void;
  readonly presentation?: "route" | "chapter";
};

type LearningWorkspaceVisualizationProps =
  | {
      readonly visualization?: undefined;
      readonly paneMode?: never;
      readonly onPaneModeChange?: never;
    }
  | {
      readonly visualization: LearningWorkspacePane;
      readonly paneMode: LearningPaneMode;
      readonly onPaneModeChange: (mode: LearningPaneMode) => void;
    };

export type LearningWorkspaceProps = LearningWorkspaceBaseProps &
  LearningWorkspaceVisualizationProps;

export function LearningRouteHeader({
  route,
  controls,
  onTitleRef,
}: LearningRouteHeaderProps): ReactElement {
  return (
    <header className="learning-route-header">
      <div className="learning-route-header__copy">
        <h2 id="learning-route-title" ref={onTitleRef} tabIndex={-1}>
          {route.title}
        </h2>
        <p>{route.subtitle}</p>
      </div>
      {controls === undefined ? null : (
        <div className="learning-route-header__controls">{controls}</div>
      )}
    </header>
  );
}

function focusStatusMessage(status: LearningFocusStatus): string {
  switch (status.availability) {
    case "available":
      return "Focus target ready.";
    case "unavailable":
      return "Focus target unavailable.";
  }
}

function handlePaneTabKey(
  event: ReactKeyboardEvent<HTMLDivElement>,
  onPaneModeChange: (mode: LearningPaneMode) => void,
): void {
  if (!(event.target instanceof HTMLButtonElement)) return;
  const tabs = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  );
  const currentIndex = tabs.indexOf(event.target);
  if (currentIndex < 0) return;
  let nextIndex: number;
  switch (event.key) {
    case "ArrowLeft":
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      break;
    case "ArrowRight":
      nextIndex = (currentIndex + 1) % tabs.length;
      break;
    case "Home":
      nextIndex = 0;
      break;
    case "End":
      nextIndex = tabs.length - 1;
      break;
    default:
      return;
  }
  const nextTab = tabs[nextIndex];
  const nextMode = nextTab?.getAttribute("data-pane-mode");
  if (
    nextTab === undefined ||
    (nextMode !== "explanation" && nextMode !== "visualization")
  )
    return;
  event.preventDefault();
  nextTab.focus();
  onPaneModeChange(nextMode);
}

export function LearningWorkspace({
  route,
  diagram,
  guide,
  status,
  headerControls,
  diagramControls,
  onRouteTitleRef,
  presentation = "route",
  visualization,
  paneMode,
  onPaneModeChange,
}: LearningWorkspaceProps): ReactElement {
  const hasVisualization = visualization !== undefined;
  return (
    <section
      className="learning-workspace"
      data-learning-route-id={route.id}
      data-learning-presentation={presentation}
      data-pane-mode={hasVisualization ? paneMode : "explanation"}
    >
      {presentation === "route" ? (
        <LearningRouteHeader
          route={route}
          controls={headerControls}
          {...(onRouteTitleRef === undefined
            ? {}
            : { onTitleRef: onRouteTitleRef })}
        />
      ) : null}
      <div className="learning-workspace__body">
        <section
          id="learning-diagram-pane"
          className="learning-workspace__pane learning-workspace__pane--diagram"
          aria-labelledby="learning-diagram-pane-title"
        >
          <span
            id="learning-diagram-pane-title"
            className="learning-visually-hidden"
          >
            {diagram.label}
          </span>
          <DiagramViewport
            label={`${diagram.label} 보기`}
            resetKey={diagram.resetKey ?? route.id}
            extraControls={diagramControls}
          >
            {diagram.content}
          </DiagramViewport>
        </section>
        <section
          id="learning-guide-pane"
          className="learning-workspace__pane learning-workspace__pane--guide"
          aria-labelledby="learning-guide-pane-title"
          data-has-visualization={hasVisualization}
        >
          <span
            id="learning-guide-pane-title"
            className="learning-visually-hidden"
          >
            {guide.label}
          </span>
          {hasVisualization ? (
            <>
              <div
                className="learning-workspace__view-tabs"
                role="tablist"
                aria-label="학습 보기"
                onKeyDown={(event) => handlePaneTabKey(event, onPaneModeChange)}
              >
                <button
                  id="learning-explanation-tab"
                  type="button"
                  role="tab"
                  aria-controls="learning-explanation-panel"
                  aria-selected={paneMode === "explanation"}
                  data-pane-mode="explanation"
                  tabIndex={paneMode === "explanation" ? 0 : -1}
                  onClick={() => onPaneModeChange("explanation")}
                >
                  설명
                </button>
                <button
                  id="learning-visualization-tab"
                  type="button"
                  role="tab"
                  aria-controls="learning-visualization-panel"
                  aria-selected={paneMode === "visualization"}
                  data-pane-mode="visualization"
                  tabIndex={paneMode === "visualization" ? 0 : -1}
                  onClick={() => onPaneModeChange("visualization")}
                >
                  시각화
                </button>
              </div>
              <div
                id="learning-explanation-panel"
                className="learning-workspace__view-panel"
                role="tabpanel"
                aria-labelledby="learning-explanation-tab"
                hidden={paneMode !== "explanation"}
              >
                {guide.content}
              </div>
              <div
                id="learning-visualization-panel"
                className="learning-workspace__view-panel"
                role="tabpanel"
                aria-labelledby="learning-visualization-tab"
                hidden={paneMode !== "visualization"}
              >
                {visualization.content}
              </div>
            </>
          ) : (
            guide.content
          )}
        </section>
      </div>
      <p
        className="learning-visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-focus-availability={status.availability}
      >
        {focusStatusMessage(status)}
      </p>
    </section>
  );
}
