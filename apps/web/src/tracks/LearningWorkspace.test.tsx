import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  test("fits every route diagram to pane width without horizontal scrolling", () => {
    const workspaceCss = readFileSync(
      resolve(process.cwd(), "src/tracks/learningWorkspace.css"),
      "utf8",
    );
    const blockCss = readFileSync(
      resolve(process.cwd(), "src/architecture/block/block.css"),
      "utf8",
    );
    const rootCss = readFileSync(
      resolve(process.cwd(), "src/architecture/root/rootArchitecture.css"),
      "utf8",
    );
    const attentionCss = readFileSync(
      resolve(process.cwd(), "src/architecture/attention/attention.css"),
      "utf8",
    );

    expect(workspaceCss).not.toMatch(/position:\s*sticky/);
    expect(blockCss).toMatch(
      /\.architecture-block-screen \.architecture-detail-diagram\s*{[^}]*min-inline-size:\s*0/s,
    );
    expect(rootCss).not.toMatch(/min-inline-size:\s*(?:36|50)rem/);
    expect(attentionCss).toMatch(
      /\.architecture-attention-screen \.architecture-attention-diagram\s*{[^}]*min-width:\s*0/s,
    );
    for (const css of [blockCss, rootCss, attentionCss]) {
      expect(css).toMatch(
        /\.architecture-svg-scroll\s*{[^}]*overflow-x:\s*clip/s,
      );
    }
  });

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
    expect(
      container.querySelectorAll("[data-focus-availability]"),
    ).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Header action" })).toBeVisible();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  test("shows understated tabs only when visualization exists", async () => {
    const user = userEvent.setup();
    const onPaneModeChange = vi.fn();
    const workspaceProps = {
      route,
      status: { availability: "available" } as const,
      onPaneModeChange,
      diagram: { label: "Diagram pane", content: <span>Diagram content</span> },
      guide: { label: "Guide pane", content: <span>Guide content</span> },
      visualization: {
        label: "Visualization pane",
        content: <button type="button">Layer 2 / Head 3</button>,
      },
    };
    const { rerender } = render(
      <LearningWorkspace {...workspaceProps} paneMode="explanation" />,
    );

    expect(screen.getByRole("tab", { name: "설명" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel", { name: "설명" })).toBeVisible();
    expect(
      document.getElementById("learning-visualization-panel"),
    ).toHaveAttribute("hidden");

    await user.click(screen.getByRole("tab", { name: "시각화" }));
    expect(onPaneModeChange).toHaveBeenCalledWith("visualization");
    rerender(
      <LearningWorkspace {...workspaceProps} paneMode="visualization" />,
    );
    expect(
      screen.getByRole("button", { name: "Layer 2 / Head 3" }),
    ).toBeVisible();
    rerender(<LearningWorkspace {...workspaceProps} paneMode="explanation" />);
    rerender(
      <LearningWorkspace {...workspaceProps} paneMode="visualization" />,
    );

    expect(
      screen.getByRole("button", { name: "Layer 2 / Head 3" }),
    ).toBeVisible();
  });

  test("forwards a chapter reset key to DiagramViewport", () => {
    render(
      <LearningWorkspace
        route={route}
        status={{ availability: "available" }}
        diagram={{
          label: "Diagram pane",
          resetKey: "decoder.chapter.1.2",
          content: <span>Diagram content</span>,
        }}
        guide={{ label: "Guide pane", content: <span>Guide content</span> }}
      />,
    );

    expect(
      document.querySelector(".diagram-viewport__content"),
    ).toHaveAttribute("data-reset-key", "decoder.chapter.1.2");
  });

  test("supports roving keyboard navigation across learning tabs", async () => {
    const user = userEvent.setup();
    const onPaneModeChange = vi.fn();
    const props = {
      route,
      status: { availability: "available" } as const,
      onPaneModeChange,
      diagram: { label: "Diagram pane", content: <span>Diagram content</span> },
      guide: { label: "Guide pane", content: <span>Guide content</span> },
      visualization: {
        label: "Visualization pane",
        content: <span>Visualization content</span>,
      },
    };
    const { rerender } = render(
      <LearningWorkspace {...props} paneMode="explanation" />,
    );
    const explanation = screen.getByRole("tab", { name: "설명" });
    const visualization = screen.getByRole("tab", { name: "시각화" });

    expect(explanation).toHaveAttribute("tabindex", "0");
    expect(visualization).toHaveAttribute("tabindex", "-1");
    explanation.focus();
    await user.keyboard("{ArrowRight}");
    expect(visualization).toHaveFocus();
    expect(onPaneModeChange).toHaveBeenLastCalledWith("visualization");

    rerender(<LearningWorkspace {...props} paneMode="visualization" />);
    await user.keyboard("{Home}");
    expect(explanation).toHaveFocus();
    expect(onPaneModeChange).toHaveBeenLastCalledWith("explanation");
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
    expect(
      document.querySelector('[data-focus-availability="unavailable"]'),
    ).not.toBeNull();
  });
});
