import type { ReactElement, ReactNode } from "react";
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
};

export type LearningRouteHeaderProps = {
  readonly route: LearningWorkspaceRoute;
  readonly controls?: ReactNode;
  readonly onTitleRef?: (element: HTMLHeadingElement | null) => void;
};

type LearningWorkspaceBaseProps = {
  readonly route: LearningWorkspaceRoute;
  readonly guide: LearningWorkspacePane;
  readonly status: LearningFocusStatus;
  readonly headerControls?: ReactNode;
  readonly onRouteTitleRef?: (element: HTMLHeadingElement | null) => void;
  readonly presentation?: "route" | "chapter";
};

export type LearningWorkspaceProps = LearningWorkspaceBaseProps;

export function LearningRouteHeader({
  route,
  controls,
  onTitleRef,
}: LearningRouteHeaderProps): ReactElement {
  return (
    <header
      className="learning-route-header"
      data-threeui-surface="learning-route-header"
    >
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

export function LearningWorkspace({
  route,
  guide,
  status,
  headerControls,
  onRouteTitleRef,
  presentation = "route",
}: LearningWorkspaceProps): ReactElement {
  return (
    <section
      className="learning-workspace"
      data-learning-route-id={route.id}
      data-learning-presentation={presentation}
      data-learning-layout="article"
      data-threeui-surface="learning-workspace"
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
      <div className="learning-workspace__article">
        <section
          id="learning-guide-pane"
          className="learning-workspace__guide"
          aria-labelledby="learning-guide-pane-title"
        >
          <span
            id="learning-guide-pane-title"
            className="learning-visually-hidden"
          >
            {guide.label}
          </span>
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
