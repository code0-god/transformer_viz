import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { describe, expect, test, vi } from "vitest";

import { App } from "./App";
import { model, TestWorker } from "./test/workerFixtures";

function readyWorkspace(hash: string): TestWorker {
  window.history.replaceState(null, "", `/${hash}`);
  const worker = new TestWorker();
  render(
    <StrictMode>
      <App
        createWorker={() => worker}
        manifestUrl="https://example.test/models/edu/manifest.json"
      />
    </StrictMode>,
  );
  act(() => {
    worker.emit({ type: "ready", model });
  });
  return worker;
}

function focusedViewer(): HTMLElement {
  const viewer = document.querySelector<HTMLElement>('[role="dialog"]');
  if (viewer === null) throw new Error("Focused viewer is missing");
  return viewer;
}

function viewerElement<T extends Element>(
  viewer: HTMLElement,
  selector: string,
): T {
  const element = viewer.querySelector<T>(selector);
  if (element === null)
    throw new Error(`Viewer element is missing: ${selector}`);
  return element;
}

async function openLabArchitecture(
  user: ReturnType<typeof userEvent.setup>,
): Promise<HTMLElement> {
  await user.click(screen.getByTestId("lab-open-architecture-root"));
  return focusedViewer();
}

describe("Learning Workspace production integration", () => {
  test("drills from Root through Attention inside one Lab viewer", async () => {
    const worker = readyWorkspace("#/lab");
    const user = userEvent.setup();
    const viewer = await openLabArchitecture(user);

    await user.click(
      viewerElement<SVGGElement>(viewer, '[data-node-id="transformer-block"]'),
    );
    await user.click(
      viewerElement<SVGGElement>(viewer, '[data-node-id="self-attention"]'),
    );

    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(screen.getByTestId("attention-detail")).toBeVisible();
    expect(worker.posted).toHaveLength(1);
  });

  test("preserves layer, head, and operation across viewer drill-down", async () => {
    const worker = readyWorkspace("#/lab");
    const user = userEvent.setup();
    const viewer = await openLabArchitecture(user);

    await user.click(
      viewerElement<SVGGElement>(viewer, '[data-node-id="transformer-block"]'),
    );
    await user.click(
      viewerElement<HTMLButtonElement>(viewer, '[data-layer-index="2"]'),
    );
    await user.click(
      viewerElement<SVGGElement>(viewer, '[data-node-id="self-attention"]'),
    );
    await user.click(
      viewerElement<HTMLButtonElement>(viewer, '[data-head-index="2"]'),
    );
    await user.click(
      viewerElement<SVGGElement>(viewer, '[data-node-id="attention-softmax"]'),
    );

    await user.click(
      viewerElement(viewer, '[data-testid="architecture-breadcrumb-gpt"]'),
    );
    await user.click(
      viewerElement<SVGGElement>(viewer, '[data-node-id="transformer-block"]'),
    );
    await user.click(
      viewerElement<SVGGElement>(viewer, '[data-node-id="self-attention"]'),
    );

    expect(screen.getByTestId("attention-detail")).toHaveAttribute(
      "data-selected-layer",
      "2",
    );
    expect(screen.getByTestId("attention-detail")).toHaveAttribute(
      "data-selected-head",
      "2",
    );
    expect(
      viewerElement<SVGGElement>(viewer, '[data-node-id="attention-softmax"]'),
    ).toHaveAttribute("aria-pressed", "true");
    expect(worker.posted).toHaveLength(1);
  });

  test("returns a viewer selection to its matching Learn section", async () => {
    const worker = readyWorkspace("#/learn/decoder-only-fundamentals/3-1");
    const user = userEvent.setup();

    expect(screen.queryByTestId("architecture-root")).toBeNull();
    await user.click(screen.getByTestId("open-diagram-viewer"));
    const viewer = focusedViewer();
    await user.click(
      viewerElement<SVGGElement>(viewer, '[data-node-id="token-embedding"]'),
    );
    await user.click(
      within(viewer).getByRole("button", { name: "설명에서 보기" }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Token과 위치를 숫자 표현으로 바꾸기",
      }),
    ).toHaveFocus();
    expect(worker.posted).toHaveLength(1);
  });

  test("opens a section viewer with the matching node highlighted", async () => {
    const worker = readyWorkspace("#/learn/decoder-only-fundamentals/4-1");
    const user = userEvent.setup();
    const section = screen.getByRole("region", { name: "Self-Attention" });

    await user.click(
      within(section).getByRole("button", { name: "Self-Attention" }),
    );
    const viewer = focusedViewer();
    expect(
      viewerElement<SVGGElement>(viewer, '[data-node-id="self-attention"]'),
    ).toHaveAttribute("data-learning-highlighted", "true");
    expect(worker.posted).toHaveLength(1);
  });

  test("preserves Attention operation across layer and head changes", async () => {
    const worker = readyWorkspace("#/learn/decoder-only-fundamentals/5-1");
    const user = userEvent.setup();
    await user.click(screen.getByTestId("open-diagram-viewer"));
    const viewer = focusedViewer();
    const softmax = viewerElement<SVGGElement>(
      viewer,
      '[data-node-id="attention-softmax"]',
    );

    await user.click(softmax);
    await user.click(
      viewerElement<HTMLButtonElement>(viewer, '[data-layer-index="1"]'),
    );
    await user.click(
      viewerElement<HTMLButtonElement>(viewer, '[data-head-index="2"]'),
    );

    expect(screen.getByTestId("attention-detail")).toHaveAttribute(
      "data-selected-layer",
      "1",
    );
    expect(screen.getByTestId("attention-detail")).toHaveAttribute(
      "data-selected-head",
      "2",
    );
    expect(softmax).toHaveAttribute("aria-pressed", "true");
    expect(worker.posted).toHaveLength(1);
  });

  test("returns repeated viewer activations to the same article heading", async () => {
    const worker = readyWorkspace("#/learn/decoder-only-fundamentals/3-1");
    const user = userEvent.setup();
    const heading = screen.getByRole("heading", {
      name: "Token과 위치를 숫자 표현으로 바꾸기",
    });
    const focus = vi.spyOn(heading, "focus");

    for (let activation = 0; activation < 2; activation += 1) {
      await user.click(screen.getByTestId("open-diagram-viewer"));
      const viewer = focusedViewer();
      await user.click(
        viewerElement<SVGGElement>(viewer, '[data-node-id="token-embedding"]'),
      );
      await user.click(
        within(viewer).getByRole("button", { name: "설명에서 보기" }),
      );
    }

    expect(focus).toHaveBeenCalledTimes(2);
    expect(worker.posted).toHaveLength(1);
  });
});
