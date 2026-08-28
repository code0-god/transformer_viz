import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMemo, useState } from "react";

import { FocusedViewerProvider } from "../overlays/FocusedViewerContext";
import { LearningGuide } from "./LearningGuide";
import { formulas, glossary, page } from "./LearningGuide.fixture";
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

const diagram = {
  label: "Diagram viewer",
  actionLabel: "Open diagram",
  request: {
    id: "decoder.root:diagram",
    kind: "diagram",
    source: "learn",
    title: "Diagram viewer",
    trackId: "decoder-only-fundamentals",
    diagramId: "fixture-diagram",
    resetKey: "fixture-diagram",
    renderDiagram: () => <div>DIAGRAM_SENTINEL</div>,
  },
} as const;

function WorkspaceFixture() {
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
    <FocusedViewerProvider>
      <LearningWorkspace
        route={route}
        status={status}
        headerControls={<button type="button">Header action</button>}
        diagram={diagram}
        guide={{
          label: "Guide article",
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
    </FocusedViewerProvider>
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

  test("renders a full-width route header and one labeled article", () => {
    // Given / When
    const { container } = render(<WorkspaceFixture />);

    // Then
    const workspace = container.querySelector(".learning-workspace");
    expect(workspace?.firstElementChild).toHaveClass("learning-route-header");
    expect(screen.getByRole("heading", { name: route.title })).toHaveAttribute(
      "id",
      "learning-route-title",
    );
    expect(screen.queryByRole("region", { name: "Diagram viewer" })).toBeNull();
    expect(
      screen.getByRole("region", { name: "Guide article" }),
    ).toHaveAttribute("id", "learning-guide-pane");
    expect(workspace).toHaveAttribute("data-learning-layout", "article");
    expect(
      container.querySelectorAll("[data-focus-availability]"),
    ).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Header action" })).toBeVisible();
    expect(screen.queryByTestId("open-diagram-viewer")).toBeNull();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  test("places visual actions after explanation without persistent tabs", async () => {
    const user = userEvent.setup();
    render(
      <FocusedViewerProvider>
        <LearningWorkspace
          route={route}
          status={{ availability: "available" }}
          diagram={diagram}
          guide={{
            label: "Guide article",
            content: (
              <LearningGuide
                page={page}
                glossary={glossary}
                formulas={formulas}
              />
            ),
          }}
          visualization={{
            label: "Visualization viewer",
            actionLabel: "Open visualization",
            request: {
              id: "decoder.root:visualization",
              kind: "visualization",
              source: "learn",
              title: "Visualization viewer",
              visualizationId:
                "decoder.visualization.attention.score-matrix-3d",
            },
          }}
        />
      </FocusedViewerProvider>,
    );

    const introduction = screen.getByTestId("guide-introduction");
    const diagramAction = screen.getByRole("button", {
      name: "OPEN_OVERVIEW",
    });
    expect(
      introduction.compareDocumentPosition(diagramAction) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      document.querySelector(".learning-workspace__viewer-actions"),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "OPEN_VISUALIZATION" }),
    ).toBeVisible();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(document.querySelector("canvas")).toBeNull();

    await user.click(diagramAction);

    expect(
      screen.getByRole("dialog", { name: "Diagram viewer" }),
    ).toBeVisible();
  });

  test("does not mount diagram content before its viewer opens", () => {
    render(<WorkspaceFixture />);

    expect(document.querySelector(".diagram-viewport")).toBeNull();
    expect(document.getElementById("learning-diagram-pane")).toBeNull();
  });

  test("reports a stale Guide target", async () => {
    // Given
    const user = userEvent.setup();
    render(<WorkspaceFixture />);

    // When
    await user.click(
      screen.getByRole("button", { name: "Focus missing node" }),
    );

    // Then
    expect(
      document.querySelector('[data-focus-availability="unavailable"]'),
    ).not.toBeNull();
  });
});
