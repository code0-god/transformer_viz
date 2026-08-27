import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";

import { App } from "./App";
import {
  attentionHeadTrace,
  generationConfig,
  generationStep,
  model,
  runSummary,
  TestWorker,
  token,
} from "./test/workerFixtures";

async function readyLab() {
  const worker = new TestWorker();
  render(
    <StrictMode>
      <App
        createWorker={() => worker}
        manifestUrl="https://example.test/models/edu/manifest.json"
      />
    </StrictMode>,
  );
  act(() => worker.emit({ type: "ready", model }));
  return { worker, user: userEvent.setup() };
}

describe("Score Matrix production App integration", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/#/lab");
  });

  test("loads only correlated actual trace values in Learn", async () => {
    const { worker, user } = await readyLab();
    const prompt = screen.getByRole("textbox", { name: "Prompt" });
    await user.clear(prompt);
    await user.type(prompt, "the cat");
    await user.click(screen.getByRole("button", { name: "Generate" }));
    act(() => {
      worker.emit({
        type: "generation_started",
        request_id: 0,
        run_id: 7,
        prompt_tokens: [token(1, "the"), token(2, "cat")],
        config: generationConfig,
        context_limit: 32,
      });
      worker.emit({
        type: "token_generated",
        request_id: 0,
        run_id: 7,
        step: generationStep(0, "!"),
      });
    });
    await user.click(screen.getByRole("button", { name: /Step 1/ }));
    act(() => {
      worker.emit({
        type: "generation_step_trace",
        request_id: 1,
        generation_run_id: 7,
        step_index: 0,
        step: generationStep(0, "!"),
        summary: runSummary(20, 5),
      });
    });

    act(() => {
      window.location.hash = "#/learn/decoder-only-fundamentals/5-1";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(
      await screen.findByRole("heading", {
        name: "Self-Attention",
        level: 1,
      }),
    ).toBeVisible();

    await user.click(screen.getByTestId("open-diagram-viewer"));
    const viewer = screen.getByRole("dialog");
    const headOne = viewer.querySelector('button[data-head-index="1"]');
    if (!(headOne instanceof HTMLButtonElement))
      throw new Error("Head 2 control missing");
    await user.click(headOne);
    await user.keyboard("{Escape}");
    await user.click(
      screen.getByRole("button", { name: "실제 Score Matrix 확인하기" }),
    );
    await user.click(
      await screen.findByRole("button", {
        name: "Layer 1, Head 2 Score 불러오기",
      }),
    );
    expect(worker.posted.at(-1)).toEqual({
      type: "inspect_attention_head",
      request_id: 2,
      run_id: 20,
      layer: 0,
      head: 1,
    });

    act(() => {
      worker.emit({
        type: "attention_head_trace",
        request_id: 2,
        run_id: 20,
        trace: attentionHeadTrace(0, 1, 5),
      });
    });

    expect(
      document.querySelector('[data-visualization-state="unavailable"]'),
    ).toBeVisible();
    const table = screen.getByRole("table", {
      name: /Layer 1, Head 2 exact values/,
    });
    expect(table).toBeVisible();
    expect(
      screen.getByRole("cell", {
        name: /질의 0 0, 키 0 0: -1.2, 허용됨/,
      }),
    ).toBeVisible();
  });
});
