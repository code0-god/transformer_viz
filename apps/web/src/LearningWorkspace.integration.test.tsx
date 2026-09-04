import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { describe, expect, test } from "vitest";

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

  test("renders GPT architecture inline without a viewer selection step", () => {
    const worker = readyWorkspace("#/learn/decoder-only-fundamentals/3-1");

    const architecture = screen.getByTestId("architecture-root");
    expect(architecture).toBeVisible();
    expect(
      architecture.querySelector('[data-node-id="token-embedding"]'),
    ).toHaveAttribute("data-interactive", "false");
    expect(screen.queryByTestId("open-diagram-viewer")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(worker.posted).toHaveLength(1);
  });

  test("keeps Block explanation inline without a section viewer", () => {
    const worker = readyWorkspace("#/learn/decoder-only-fundamentals/4-1");
    const section = screen.getByRole("region", { name: "Self-Attention" });

    expect(within(section).queryByRole("button")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(worker.posted).toHaveLength(1);
  });

  test("preserves Attention operation across layer and head changes", async () => {
    const worker = readyWorkspace("#/lab");
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /Attention Self-Attention/ }),
    );
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

  test("uses Chapter navigation instead of viewer return state", async () => {
    const worker = readyWorkspace("#/learn/decoder-only-fundamentals/3-1");
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("link", {
        name: "Transformer Block 설명으로 이동",
      }),
    );
    expect(screen.getByRole("region", { name: "Block의 목적" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "목차 열기" }));
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Chapter 목차" }),
      ).getByRole("link", { name: "GPT" }),
    );
    expect(screen.getByTestId("architecture-root")).toBeVisible();
    expect(worker.posted).toHaveLength(1);
  });
});
