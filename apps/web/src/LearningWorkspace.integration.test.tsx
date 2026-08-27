import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { vi } from "vitest";

import { App } from "./App";
import { model, TestWorker } from "./test/workerFixtures";

async function readyWorkspace() {
  window.history.replaceState(null, "", "/#/lab");
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
  expect(screen.getByTestId("architecture-root")).toBeInTheDocument();
  return worker;
}

describe("Learning Workspace production integration", () => {
  test("preserves layer, head, operation, and Worker traffic across routes", async () => {
    // Given: the learner opens Block, layer 2, Attention, head 2, and Softmax.
    const worker = await readyWorkspace();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /반복 Transformer Blocks/ }),
    );
    await user.click(screen.getByRole("button", { name: "Layer 2" }));
    await user.click(
      screen.getByRole("button", {
        name: /Causal Multi-Head Self-Attention/,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Head 2" }));
    await user.click(screen.getByLabelText(/Softmax.*선택 가능/));

    // When: the learner returns to Root and drills down again.
    await user.click(screen.getByTestId("architecture-breadcrumb-gpt"));
    await user.click(
      screen.getByRole("button", { name: /반복 Transformer Blocks/ }),
    );
    await user.click(
      screen.getByRole("button", {
        name: /Causal Multi-Head Self-Attention/,
      }),
    );

    // Then: architecture state survives and no navigation posts to the Worker.
    expect(screen.getByTestId("attention-detail")).toHaveAttribute(
      "data-selected-layer",
      "2",
    );
    expect(screen.getByTestId("attention-detail")).toHaveAttribute(
      "data-selected-head",
      "2",
    );
    expect(screen.getByLabelText(/Softmax.*선택 가능/)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(worker.posted).toHaveLength(1);
  });

  test("synchronizes diagram activation with the route Guide", async () => {
    // Given: the Root learning workspace is ready without generation traffic.
    const worker = await readyWorkspace();
    const user = userEvent.setup();

    // When: the learner activates Token Embedding in the real diagram.
    const embedding = screen.getByRole("button", {
      name: /Token embedding lookup/,
    });
    await user.click(embedding);

    // Then: architecture selection and the matching Guide advance together.
    expect(embedding).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("region", {
        name: "Token과 위치를 숫자 표현으로 바꾸기",
      }),
    ).toHaveAttribute("data-active", "true");
    expect(document.activeElement).toHaveAttribute(
      "data-guide-section-id",
      "root-embeddings",
    );
    expect(worker.posted).toHaveLength(1);
  });

  test("keeps Guide focus independent while routing through the shared header", async () => {
    // Given: LN1 is selected in the Block workspace.
    const worker = await readyWorkspace();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /반복 Transformer Blocks/ }),
    );
    await user.click(screen.getByLabelText(/LayerNorm 1.*선택 가능/));
    const postsBeforeGuide = worker.posted.length;

    // When: the Guide asks to reveal Self-Attention.
    const guideSection = screen.getByRole("region", {
      name: "Self-Attention",
    });
    await user.click(
      within(guideSection).getByRole("button", { name: "Self-Attention" }),
    );

    // Then: only learning focus changes.
    expect(screen.getByLabelText(/LayerNorm 1.*선택 가능/)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const attention = screen.getByLabelText(
      /Causal Multi-Head Self-Attention.*자세히 보기 가능/,
    );
    expect(attention).toHaveAttribute("data-learning-highlighted", "true");
    expect(worker.posted).toHaveLength(postsBeforeGuide);

    // When: the highlighted node is activated.
    await user.click(attention);

    // Then: the shared heading owns the route reset and focus exactly once.
    expect(screen.getByTestId("attention-detail")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("region")
        .filter((region) => region.getAttribute("data-active") === "true"),
    ).toHaveLength(0);
    expect(document.activeElement).toHaveAttribute(
      "id",
      "learning-route-title",
    );
    expect(worker.posted).toHaveLength(postsBeforeGuide);
  });

  test("preserves Attention Guide focus across layer and head changes", async () => {
    // Given: Softmax is active in the Attention workspace.
    const worker = await readyWorkspace();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /반복 Transformer Blocks/ }),
    );
    await user.click(
      screen.getByRole("button", { name: /Causal Multi-Head Self-Attention/ }),
    );
    await user.click(screen.getByLabelText(/Softmax.*선택 가능/));

    // When: route-local layer and head controls change.
    await user.click(screen.getByRole("button", { name: "Layer 1" }));
    await user.click(screen.getByRole("button", { name: "Head 2" }));

    // Then: page, focus, selection, and Worker traffic are preserved.
    expect(screen.getByTestId("attention-detail")).toHaveAttribute(
      "data-selected-layer",
      "1",
    );
    expect(screen.getByTestId("attention-detail")).toHaveAttribute(
      "data-selected-head",
      "2",
    );
    expect(
      screen.getByRole("region", { name: "Score를 Weight로 바꾸기" }),
    ).toHaveAttribute("data-active", "true");
    expect(screen.getByLabelText(/Softmax.*선택 가능/)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(worker.posted).toHaveLength(1);
  });

  test("reveals the Guide again when the same diagram node is activated", async () => {
    // Given: the matching Guide section can observe each direct reveal.
    const worker = await readyWorkspace();
    const user = userEvent.setup();
    const section = screen.getByRole("region", {
      name: "Token과 위치를 숫자 표현으로 바꾸기",
    });
    const focus = vi.spyOn(section, "focus");
    const embedding = screen.getByRole("button", {
      name: /Token embedding lookup/,
    });

    // When: the already-selected diagram node is activated again.
    await user.click(embedding);
    await user.click(embedding);

    // Then: both real activations invoke the target reveal, not just selection.
    expect(focus).toHaveBeenCalledTimes(2);
    expect(worker.posted).toHaveLength(1);
  });
});
