import type { GenerationState } from "../app/generationState";
import "./ContinuationPanel.css";
import { decodeTokenPieces } from "./decodeTokenPieces";

export type ContinuationPanelProps = Readonly<{
  generation: GenerationState;
  onSelectStep: (stepIndex: number) => void;
}>;

function stopReason(generation: GenerationState): string {
  if (generation.stopReason !== null) return generation.stopReason;
  switch (generation.phase) {
    case "idle":
      return "not started";
    case "running":
      return "running";
    case "complete":
      return "complete";
    case "error":
      return "error";
  }
}

export function ContinuationPanel({
  generation,
  onSelectStep,
}: ContinuationPanelProps) {
  const continuation = decodeTokenPieces(
    generation.steps.map((step) => step.generated_token.piece),
  );
  const contextUsed = generation.promptTokens.length + generation.steps.length;
  return (
    <section
      className="continuation-panel"
      aria-labelledby="continuation-title"
      data-output-state={generation.phase}
      data-threeui-surface="generation-output"
    >
      <header className="continuation-panel__header">
        <h2 id="continuation-title" aria-label="Decoded continuation">
          Output
        </h2>
        <span>{stopReason(generation)}</span>
      </header>
      <dl className="decoded-text">
        <div>
          <dt>Prompt</dt>
          <dd>
            <output>{generation.promptText || "—"}</output>
          </dd>
        </div>
        <div>
          <dt>Continuation</dt>
          <dd>
            <output aria-live="polite">{continuation || "—"}</output>
          </dd>
        </div>
      </dl>
      <ul className="generation-steps" aria-label="Generated token steps">
        {generation.steps.map((step) => (
          <li key={step.index}>
            <button
              type="button"
              aria-label={`Step ${step.index + 1}: token ${step.generated_token.display}`}
              aria-current={
                generation.selectedStep === step.index ? "step" : undefined
              }
              onClick={() => onSelectStep(step.index)}
            >
              <span>{step.generated_token.display}</span>
              <small>ID {step.generated_token.id}</small>
            </button>
          </li>
        ))}
      </ul>
      {generation.selectedStep === null
        ? null
        : (() => {
            const selected = generation.steps[generation.selectedStep];
            return selected === undefined ? null : (
              <dl className="token-details">
                <div>
                  <dt>Token ID</dt>
                  <dd>{selected.generated_token.id}</dd>
                </div>
                <div>
                  <dt>Bytes</dt>
                  <dd>{selected.generated_token.piece.join(", ")}</dd>
                </div>
                <div>
                  <dt>Probability</dt>
                  <dd>{selected.selected_probability}</dd>
                </div>
                <div>
                  <dt>Total time</dt>
                  <dd>{selected.total_ms} ms</dd>
                </div>
              </dl>
            );
          })()}
      <p className="generation-usage">
        <span>Stop reason: {stopReason(generation)}</span>
        <span>
          {contextUsed} / {generation.contextLimit} tokens
        </span>
      </p>
    </section>
  );
}
