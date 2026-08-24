import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMemo, useState } from "react";
import { vi } from "vitest";

import { LearningWorkspace } from "./LearningWorkspace";
import {
  createLearningFocusRegistry,
  type LearningFocusStatus,
} from "./learningFocus";

const route = {
  id: "decoder.root",
  title: "Route title",
  subtitle: "Route subtitle",
} as const;

function WorkspaceFixture({
  selectArchitecture,
}: Readonly<{ selectArchitecture: () => void }>) {
  const [status, setStatus] = useState<LearningFocusStatus>({
    availability: "available",
  });
  const registry = useMemo(
    () =>
      createLearningFocusRegistry({
        prefersReducedMotion: () => false,
        reportStatus: setStatus,
      }),
    [],
  );

  return (
    <LearningWorkspace
      route={route}
      status={status}
      headerControls={<button type="button">Header action</button>}
      diagram={{
        label: "Diagram pane",
        content: (
          <button type="button" onClick={selectArchitecture}>
            Select architecture
          </button>
        ),
      }}
      guide={{
        label: "Guide pane",
        content: (
          <button
            type="button"
            onClick={() =>
              registry.reveal(
                {
                  kind: "node",
                  routeId: route.id,
                  nodeId: "decoder.root.token-embedding",
                },
                { focus: true },
              )
            }
          >
            Focus missing node
          </button>
        ),
      }}
    />
  );
}

describe("LearningWorkspace", () => {
  test("renders a full-width route header and stable labeled panes", () => {
    // Given / When
    const { container } = render(
      <WorkspaceFixture selectArchitecture={() => undefined} />,
    );

    // Then
    const workspace = container.querySelector(".learning-workspace");
    expect(workspace?.firstElementChild).toHaveClass("learning-route-header");
    expect(screen.getByRole("heading", { name: route.title })).toHaveAttribute(
      "id",
      "learning-route-title",
    );
    expect(
      screen.getByRole("region", { name: "Diagram pane" }),
    ).toHaveAttribute("id", "learning-diagram-pane");
    expect(screen.getByRole("region", { name: "Guide pane" })).toHaveAttribute(
      "id",
      "learning-guide-pane",
    );
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Header action" })).toBeVisible();
  });

  test("reports a stale Guide target without selecting architecture", async () => {
    // Given
    const user = userEvent.setup();
    const selectArchitecture = vi.fn();
    render(<WorkspaceFixture selectArchitecture={selectArchitecture} />);

    // When
    await user.click(
      screen.getByRole("button", { name: "Focus missing node" }),
    );

    // Then
    expect(selectArchitecture).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveAttribute(
      "data-focus-availability",
      "unavailable",
    );
  });
});
