import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  createGenerationState,
  type GenerationForm,
} from "../app/generationState";
import { ContinuationPanel } from "./ContinuationPanel";
import { Header } from "./Header";
import { PromptPanel } from "./PromptPanel";

const form: GenerationForm = {
  maxNewTokens: "24",
  temperature: "1.0",
  topK: "20",
  mode: "sample",
  seed: "42",
};

describe("controlled generation UI", () => {
  test("renders lifecycle state and emits parsed Generate data", async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    const onFormChange = vi.fn();
    const onPromptChange = vi.fn();
    render(
      <>
        <Header status={{ type: "ready" }} activeView="lab" />
        <PromptPanel
          prompt="the cat"
          form={form}
          limits={{ blockSize: 32, vocabSize: 64 }}
          generation={createGenerationState()}
          onPromptChange={onPromptChange}
          onFormChange={onFormChange}
          onGenerate={onGenerate}
          onStop={vi.fn()}
        />
      </>,
    );

    expect(screen.getByText("Model Ready")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Prompt" }), "!");
    expect(onPromptChange).toHaveBeenLastCalledWith("the cat!");
    const generate = screen.getByRole("button", { name: "Generate" });
    expect(generate.closest(".lumen-cta")).toBeInTheDocument();
    expect(
      screen.getByTestId("generate").closest(".threeui-action-host"),
    ).toHaveAttribute("data-control-tier", "primary");
    await user.click(generate);
    expect(onGenerate).toHaveBeenCalledWith("the cat", {
      max_new_tokens: 24,
      temperature: 1,
      top_k: 20,
      mode: "sample",
      seed: 42,
    });
    expect(onFormChange).toHaveBeenLastCalledWith({
      ...form,
      temperature: "1",
    });
  });

  test("switches to the 44px Stop action for an active stream", async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    render(
      <PromptPanel
        prompt="the cat"
        form={form}
        limits={{ blockSize: 32, vocabSize: 64 }}
        generation={{
          ...createGenerationState(),
          phase: "running",
          active: {
            requestId: { kind: "safe-id", value: 1 },
            runId: { kind: "safe-id", value: 2 },
          },
        }}
        onPromptChange={vi.fn()}
        onFormChange={vi.fn()}
        onGenerate={vi.fn()}
        onStop={onStop}
      />,
    );

    const stop = screen.getByRole("button", { name: "Stop" });
    expect(stop.closest(".lumen-cta")).toBeInTheDocument();
    expect(stop.closest(".threeui-action-host")).toHaveAttribute(
      "data-control-tier",
      "secondary",
    );
    await user.click(stop);
    expect(onStop).toHaveBeenCalledOnce();
  });

  test("exposes a disabled ThreeUI stopping state", () => {
    render(
      <PromptPanel
        prompt="the cat"
        form={form}
        limits={{ blockSize: 32, vocabSize: 64 }}
        generation={{
          ...createGenerationState(),
          phase: "running",
          stopPending: true,
          active: {
            requestId: { kind: "safe-id", value: 1 },
            runId: { kind: "safe-id", value: 2 },
          },
        }}
        onPromptChange={vi.fn()}
        onFormChange={vi.fn()}
        onGenerate={vi.fn()}
        onStop={vi.fn()}
      />,
    );

    const stopping = screen.getByRole("button", { name: "Stopping…" });
    expect(stopping).toBeDisabled();
    expect(stopping.closest(".threeui-action-host")).toHaveAttribute(
      "data-control-state",
      "stopping",
    );
  });

  test("renders decoded runtime continuation and selects a real step", async () => {
    const user = userEvent.setup();
    const onSelectStep = vi.fn();
    render(
      <ContinuationPanel
        generation={{
          ...createGenerationState(),
          phase: "complete",
          promptText: "a",
          promptTokens: [
            {
              id: 1,
              display: "a",
              piece: [97],
              byte_start: 0,
              byte_end: 1,
              kind: "byte",
            },
          ],
          contextLimit: 8,
          stopReason: "max_new_tokens",
          selectedStep: 0,
          steps: [
            {
              index: 0,
              context_token_ids: [1],
              generated_token: {
                id: 2,
                display: "b",
                piece: [98],
                byte_start: null,
                byte_end: null,
                kind: "byte",
              },
              selected_logit: 2,
              selected_probability: 0.75,
              candidates: [],
              random: null,
              selected_interval: null,
              forward_ms: 1,
              sampling_ms: 0.5,
              total_ms: 1.5,
            },
          ],
        }}
        onSelectStep={onSelectStep}
      />,
    );

    expect(screen.getByText("a", { selector: "output" })).toBeInTheDocument();
    expect(screen.getByText("b", { selector: "output" })).toBeInTheDocument();
    expect(screen.getByText("Stop reason: max_new_tokens")).toBeInTheDocument();
    expect(screen.getByText("2 / 8 tokens")).toBeInTheDocument();
    expect(screen.getByText("Probability")).toBeInTheDocument();
    expect(screen.getByText("0.75")).toBeInTheDocument();
    const output = screen.getByRole("region", { name: "Decoded continuation" });
    const runtime = screen.getByRole("region", { name: "Runtime" });
    const runtimeBoundary = document.querySelector(
      '[data-boundary-id="lab-runtime"]',
    );
    expect(runtimeBoundary).not.toBeNull();
    expect(output).not.toContainElement(screen.getByText("Probability"));
    expect(runtime).toContainElement(screen.getByText("Probability"));
    expect(
      output.compareDocumentPosition(runtime) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    const step = screen.getByRole("button", { name: /step 1/i });
    expect(step).toHaveAttribute("aria-current", "step");
    await user.click(step);
    expect(onSelectStep).toHaveBeenCalledWith(0);
  });

  test("keeps continuation CSS current, scoped, and unclamped", () => {
    const continuationCss = readFileSync(
      resolve(process.cwd(), "src/components/ContinuationPanel.css"),
      "utf8",
    );
    const globalCss = readFileSync(resolve(process.cwd(), "style.css"), "utf8");

    expect(continuationCss).toContain(".continuation-panel .decoded-text");
    expect(continuationCss).toContain(".continuation-panel .generation-steps");
    expect(continuationCss).toContain(".runtime-panel .token-details");
    expect(continuationCss).not.toMatch(/line-clamp|overflow:\s*hidden/);

    for (const staleSelector of [
      "generation-timeline",
      "decoded-output",
      "token-reel",
      "raw-token",
      "generated",
    ]) {
      expect(globalCss).not.toContain(`.${staleSelector}`);
    }
    expect(globalCss).not.toMatch(
      /\.architecture-(?:diagram|annotation|breadcrumb|detail)(?:\s|\{|[.:])/,
    );
  });
});
