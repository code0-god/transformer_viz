import { act, render, screen } from "@testing-library/react";
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
  expect(document.getElementById("status")).toHaveAttribute(
    "data-status",
    "ready",
  );
  expect(
    screen.getByTestId("architecture-root").closest("[data-learning-track-id]"),
  ).toHaveAttribute("data-learning-track-id", "decoder-only-fundamentals");
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
  test("surfaces a synchronous Worker construction error", () => {
    render(
      <App
        createWorker={() => {
          throw new Error("WORKER_CONSTRUCTION_SENTINEL");
        }}
        manifestUrl="https://example.test/models/edu/manifest.json"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "WORKER_CONSTRUCTION_SENTINEL",
    );
    expect(document.getElementById("status")).toHaveAttribute(
      "data-status",
      "error",
    );
  });

  test("owns one initialized Worker under StrictMode and terminates on final cleanup", async () => {
    const { worker, rendered } = renderApp();
    expect(screen.getByRole("textbox", { name: "Prompt" })).toHaveValue(
      "the cat",
    );
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

  test("shows a correlated generation error in the global lifecycle", async () => {
    const { worker } = await readyApp();
    await startGeneration(worker);
    act(() => {
      worker.emit({
        type: "error",
        request_id: 0,
        code: "invalid_request",
        message: "GENERATION_ERROR_SENTINEL",
      });
    });
    expect(document.querySelector(".lifecycle-detail")).toHaveTextContent(
      "GENERATION_ERROR_SENTINEL",
    );
    expect(document.querySelector(".generation-error")).toHaveTextContent(
      "GENERATION_ERROR_SENTINEL",
    );
    expect(document.getElementById("status")).toHaveAttribute(
      "data-status",
      "error",
    );
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
      document.querySelector(
        '[data-runtime-presentation-id="decoder.runtime.attention-facts"] [data-guide-fact-id="decoder.fact.sequence-length"] [data-fact-status="ready"]',
      ),
    ).toHaveTextContent("5");
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

  test("surfaces a module Worker script-load error", () => {
    const { worker } = renderApp();
    act(() => {
      worker.emitError();
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Model Worker failed to load",
    );
    expect(document.getElementById("status")).toHaveAttribute(
      "data-status",
      "error",
    );
  });

  test("renders a controlled error for an unsupported learning profile", () => {
    const { worker } = renderApp();
    act(() => {
      worker.emit({
        type: "ready",
        model: {
          ...model,
          model_id: "unknown-model",
          architecture: {
            ...model.architecture,
            architecture_id: "unknown-architecture",
          },
        },
      });
    });

    expect(screen.getByRole("alert")).toHaveTextContent("unknown-model");
    expect(screen.getByRole("alert")).toHaveTextContent("unknown-architecture");
    expect(screen.queryByTestId("architecture-root")).not.toBeInTheDocument();
    expect(worker.posted).toHaveLength(1);
  });
});
