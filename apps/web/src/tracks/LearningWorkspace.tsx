import type { ReactElement, ReactNode } from "react";

import type { LearningFocusStatus } from "./learningFocus";
import type { LearningRouteId } from "./workspaceTypes";
import "./learningWorkspace.css";

export type LearningWorkspaceRoute = {
  readonly id: LearningRouteId;
  readonly title: string;
  readonly subtitle: string;
};

type LearningWorkspacePane = {
  readonly label: string;
  readonly content: ReactNode;
};

export type LearningRouteHeaderProps = {
  readonly route: LearningWorkspaceRoute;
  readonly controls?: ReactNode;
};

export type LearningWorkspaceProps = {
  readonly route: LearningWorkspaceRoute;
  readonly diagram: LearningWorkspacePane;
  readonly guide: LearningWorkspacePane;
  readonly status: LearningFocusStatus;
  readonly headerControls?: ReactNode;
};

export function LearningRouteHeader({
  route,
  controls,
}: LearningRouteHeaderProps): ReactElement {
  return (
    <header className="learning-route-header">
      <div className="learning-route-header__copy">
        <h2 id="learning-route-title">{route.title}</h2>
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

export function LearningWorkspace({
  route,
  diagram,
  guide,
  status,
  headerControls,
}: LearningWorkspaceProps): ReactElement {
  return (
    <section className="learning-workspace" data-learning-route-id={route.id}>
      <LearningRouteHeader route={route} controls={headerControls} />
      <div className="learning-workspace__body">
        <section
          id="learning-diagram-pane"
          className="learning-workspace__pane learning-workspace__pane--diagram"
          aria-labelledby="learning-diagram-pane-title"
        >
          <h3
            id="learning-diagram-pane-title"
            className="learning-visually-hidden"
          >
            {diagram.label}
          </h3>
          <div className="learning-workspace__diagram-scroll">
            {diagram.content}
          </div>
        </section>
        <section
          id="learning-guide-pane"
          className="learning-workspace__pane learning-workspace__pane--guide"
          aria-labelledby="learning-guide-pane-title"
        >
          <h3
            id="learning-guide-pane-title"
            className="learning-visually-hidden"
          >
            {guide.label}
          </h3>
          {guide.content}
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
