import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { App } from "./App";
import {
  generationConfig,
  generationStep,
  model,
  runSummary,
  TestWorker,
  token,
} from "./test/workerFixtures";

function renderApp() {
  const worker = new TestWorker();
  const rendered = render(
    <StrictMode>
      <App
        createWorker={() => worker}
        manifestUrl="https://example.test/models/edu/manifest.json"
      />
    </StrictMode>,
  );
  return { worker, rendered };
}

async function readyApp() {
  const result = renderApp();
  act(() => {
    result.worker.emit({ type: "ready", model });
  });
  await waitFor(() => {
    expect(document.getElementById("status")).toHaveAttribute(
      "data-status",
      "ready",
    );
  });
  return result;
}

async function startGeneration(
  worker: TestWorker,
  prompt = "Once upon a time",
) {
  const user = userEvent.setup();
  const promptBox = screen.getByRole("textbox", { name: "Prompt" });
  await user.clear(promptBox);
  await user.type(promptBox, prompt);
  await user.click(screen.getByRole("button", { name: "Generate" }));
  act(() => {
    worker.emit({
      type: "generation_started",
      request_id: 0,
      run_id: 7,
      prompt_tokens: [token(1, prompt)],
      config: generationConfig,
      context_limit: 32,
    });
  });
  return user;
}

describe("production React Worker integration", () => {
  test("owns one initialized Worker under StrictMode and terminates on final cleanup", async () => {
    const { worker, rendered } = renderApp();
    expect(worker.posted).toEqual([
      {
        type: "initialize",
        manifest_url: "https://example.test/models/edu/manifest.json",
      },
    ]);
    expect(worker.listeners).toHaveLength(1);
    rendered.unmount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(worker.terminations).toBe(1);
  });

  test("generates once, grants one continuation credit per token, and stops", async () => {
    const { worker } = await readyApp();
    const user = await startGeneration(worker);
    expect(
      worker.posted.filter((request) => request.type === "generate"),
    ).toEqual([
      {
        type: "generate",
        request_id: 0,
        text: "Once upon a time",
        config: generationConfig,
      },
    ]);

    act(() => {
      worker.emit({
        type: "token_generated",
        request_id: 0,
        run_id: 7,
        step: generationStep(0, "!"),
      });
    });
    expect(screen.getByText("!", { selector: "output" })).toBeInTheDocument();
    expect(
      worker.posted.filter((request) => request.type === "continue_generation"),
    ).toEqual([
      {
        type: "continue_generation",
        request_id: 0,
        run_id: 7,
        step_index: 0,
      },
    ]);
    await user.click(screen.getByRole("button", { name: "Stop" }));
    expect(worker.posted.at(-1)).toEqual({
      type: "stop_generation",
      request_id: 0,
      run_id: 7,
    });
  });

  test("replays a selected generated step and exposes trace-only attention T", async () => {
    const { worker } = await readyApp();
    const user = await startGeneration(worker);
    const step = generationStep(0, "!");
    act(() => {
      worker.emit({
        type: "token_generated",
        request_id: 0,
        run_id: 7,
        step,
      });
    });
    await user.click(screen.getByRole("button", { name: /Step 1/ }));
    expect(worker.posted.at(-1)).toEqual({
      type: "inspect_generation_step",
      request_id: 1,
      generation_run_id: 7,
      step_index: 0,
    });
    act(() => {
      worker.emit({
        type: "generation_step_trace",
        request_id: 1,
        generation_run_id: 7,
        step_index: 0,
        step,
        summary: runSummary(20, 5),
      });
    });
    await user.click(
      screen.getByRole("button", { name: /반복 Transformer Blocks/ }),
    );
    await user.click(
      screen.getByRole("button", { name: /Causal Multi-Head Self-Attention/ }),
    );
    expect(
      within(screen.getByLabelText("현재 모델값")).getByText("5"),
    ).toBeInTheDocument();
  });

  test("keeps architecture navigation pure and preserves layer, head, and operation", async () => {
    const { worker } = await readyApp();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /반복 Transformer Blocks/ }),
    );
    await user.click(screen.getByRole("button", { name: "2" }));
    await user.click(
      screen.getByRole("button", { name: /Causal Multi-Head Self-Attention/ }),
    );
    await user.click(screen.getByRole("button", { name: "Head 2" }));
    await user.click(screen.getByLabelText(/Softmax.*선택 가능/));
    await user.click(screen.getByTestId("architecture-breadcrumb-gpt"));
    await user.click(
      screen.getByRole("button", { name: /반복 Transformer Blocks/ }),
    );
    await user.click(
      screen.getByRole("button", { name: /Causal Multi-Head Self-Attention/ }),
    );

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

  test("surfaces guard rejection and never renders prompt text through KaTeX", async () => {
    const { worker } = await readyApp();
    await startGeneration(worker, "$x^2$");
    expect(
      screen.getByText("$x^2$", { selector: "output" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("$x^2$", { selector: "output" }).querySelector(".katex"),
    ).toBeNull();
    act(() => {
      worker.emit({ type: "ready" });
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Worker returned an invalid response",
    );
  });
});
