import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { App } from "./App";
import { registerAppRouteTests } from "./app/testLocation";
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

function readyWorker(worker: TestWorker): void {
  act(() => {
    worker.emit({ type: "ready", model });
  });
}

async function readyApp() {
  const result = renderApp();
  readyWorker(result.worker);
  expect(document.getElementById("status")).toHaveAttribute(
    "data-status",
    "ready",
  );
  expect(screen.getByTestId("lab-open-architecture-root")).toBeEnabled();
  expect(screen.queryByTestId("architecture-root")).toBeNull();
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

registerAppRouteTests({ renderApp, readyWorker });

describe("production React Worker integration", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/#/lab");
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

  test("names Lab inspection launchers from their visible copy", async () => {
    const { worker } = renderApp();
    readyWorker(worker);

    const root = screen.getByTestId("lab-open-architecture-root");
    expect(root).not.toHaveAttribute("aria-label");
    expect(root).toHaveAccessibleName(/Model 전체 구조 \d+ blocks · 4 heads/);
    expect(
      screen.getByRole("button", {
        name: /Attention Self-Attention Layer 1 · Head 1/,
      }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", {
        name: /Score Matrix Actual trace Generate and select step/,
      }),
    ).toBeDisabled();
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
    expect(
      screen.getByText("GENERATION_ERROR_SENTINEL", {
        selector: ".lifecycle-detail",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("GENERATION_ERROR_SENTINEL", {
        selector: ".generation-error",
      }),
    ).toBeInTheDocument();
    expect(document.getElementById("status")).toHaveAttribute(
      "data-status",
      "error",
    );
  });

  test("replays a selected step and opens attention inspection on demand", async () => {
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
    const requestCount = worker.posted.length;
    await user.click(
      screen.getByRole("button", { name: /Attention Self-Attention/ }),
    );
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByTestId("attention-detail")).toHaveAttribute(
      "data-selected-layer",
      "0",
    );
    expect(screen.getByTestId("attention-detail")).toHaveAttribute(
      "data-selected-head",
      "0",
    );
    expect(worker.posted).toHaveLength(requestCount);
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

  test("renders a controlled viewer error for an unsupported learning profile", async () => {
    const { worker } = renderApp();
    const user = userEvent.setup();
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

    await user.click(screen.getByTestId("lab-open-architecture-root"));

    expect(screen.getByRole("alert")).toHaveTextContent("unknown-model");
    expect(screen.getByRole("alert")).toHaveTextContent("unknown-architecture");
    expect(screen.queryByTestId("architecture-root")).not.toBeInTheDocument();
    expect(worker.posted).toHaveLength(1);
  });
});
