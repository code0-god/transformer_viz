import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";

import { App } from "./App";
import { model, TestWorker } from "./test/workerFixtures";

async function readyWorkspace() {
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
    const rootBlock = document.querySelector(
      '[data-node-id="transformer-block"]',
    );
    if (!(rootBlock instanceof SVGElement))
      throw new Error("Missing Root Block node");
    await user.click(rootBlock);
    const layer = document.querySelector('[data-layer-index="2"]');
    if (!(layer instanceof HTMLButtonElement))
      throw new Error("Missing Layer 2 control");
    await user.click(layer);
    const blockAttention = document.querySelector(
      '[data-node-id="self-attention"]',
    );
    if (!(blockAttention instanceof SVGElement))
      throw new Error("Missing Block Self-Attention node");
    await user.click(blockAttention);
    const head = document.querySelector('[data-head-index="2"]');
    if (!(head instanceof HTMLButtonElement))
      throw new Error("Missing Head 2 control");
    await user.click(head);
    await user.click(screen.getByLabelText(/Softmax.*선택 가능/));

    // When: the learner returns to Root and drills down again.
    await user.click(screen.getByTestId("architecture-breadcrumb-gpt"));
    const returnedBlock = document.querySelector(
      '[data-node-id="transformer-block"]',
    );
    if (!(returnedBlock instanceof SVGElement))
      throw new Error("Missing returned Root Block node");
    await user.click(returnedBlock);
    const returnedAttention = document.querySelector(
      '[data-node-id="self-attention"]',
    );
    if (!(returnedAttention instanceof SVGElement))
      throw new Error("Missing returned Self-Attention node");
    await user.click(returnedAttention);

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
    const embedding = document.querySelector(
      '[data-node-id="token-embedding"]',
    );
    if (!(embedding instanceof SVGElement))
      throw new Error("Missing Token Embedding node");
    await user.click(embedding);

    // Then: architecture selection and the matching Guide advance together.
    expect(embedding).toHaveAttribute("aria-pressed", "true");
    expect(
      document.querySelector('[data-guide-section-id="root-embeddings"]'),
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
    const guideSection = document.querySelector(
      '[data-guide-section-id="block-self-attention"]',
    );
    if (!(guideSection instanceof HTMLElement))
      throw new Error("Missing block Self-Attention Guide section");
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
    expect(document.querySelector("[data-active=true]")).toBeNull();
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
      document.querySelector('[data-guide-section-id="softmax"]'),
    ).toHaveAttribute("data-active", "true");
    expect(screen.getByLabelText(/Softmax.*선택 가능/)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(worker.posted).toHaveLength(1);
  });
});
