import {
  type GenerationForm,
  type GenerationLimits,
  type GenerationState,
  parseGenerationForm,
} from "../app/generationState";
import type { GenerationConfig, SamplingMode } from "../generated/schema";
import { ThreeUiAction } from "../threeui/ThreeUi";

export type PromptPanelProps = Readonly<{
  prompt: string;
  form: GenerationForm;
  limits: GenerationLimits;
  generation: GenerationState;
  disabled?: boolean;
  onPromptChange: (prompt: string) => void;
  onFormChange: (form: GenerationForm) => void;
  onGenerate: (prompt: string, config: GenerationConfig) => void;
  onStop: () => void;
}>;

type TextField = "maxNewTokens" | "temperature" | "topK" | "seed";

function samplingMode(value: string): SamplingMode {
  return value === "greedy" ? "greedy" : "sample";
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: string) => void;
}>) {
  return (
    <label htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

export function PromptPanel(props: PromptPanelProps) {
  const running = props.generation.phase === "running";
  const stopping = running && props.generation.stopPending;
  const generateDisabled =
    props.disabled === true || props.generation.pending !== null;
  const changeText = (field: TextField, value: string) => {
    props.onFormChange({ ...props.form, [field]: value });
  };
  const generate = () => {
    const parsed = parseGenerationForm(props.form, props.limits);
    props.onFormChange(parsed.form);
    props.onGenerate(props.prompt, parsed.config);
  };

  return (
    <section
      className="generation-bar"
      aria-labelledby="prompt-label"
      data-generation-state={
        stopping ? "stopping" : running ? "generating" : props.generation.phase
      }
      data-threeui-surface="generation-controls"
    >
      <header className="generation-bar__header">
        <div>
          <h2 id="prompt-label">Prompt</h2>
          <p>Generation input</p>
        </div>
        <span>{stopping ? "Stopping" : running ? "Generating" : "Ready"}</span>
      </header>
      <div className="generation-primary">
        <label className="prompt-field" htmlFor="generation-prompt">
          <span>Prompt text</span>
          <textarea
            id="generation-prompt"
            aria-label="Prompt"
            rows={1}
            value={props.prompt}
            onChange={(event) =>
              props.onPromptChange(event.currentTarget.value)
            }
          />
        </label>
        {running ? (
          <ThreeUiAction
            busy={stopping}
            disabled={stopping}
            label={stopping ? "Stopping…" : "Stop"}
            onClick={props.onStop}
            state={stopping ? "stopping" : "working"}
            tier="secondary"
            type="button"
          />
        ) : (
          <ThreeUiAction
            busy={props.generation.pending !== null}
            disabled={generateDisabled}
            label="Generate"
            onClick={generate}
            state={
              props.generation.phase === "error"
                ? "error"
                : props.generation.pending === null
                  ? "idle"
                  : "working"
            }
            testId="generate"
            tier="primary"
            type="button"
          />
        )}
      </div>
      <details className="generation-settings">
        <summary>
          <span>Settings</span>
          <small>
            Temperature {props.form.temperature} · Top-K {props.form.topK}
          </small>
        </summary>
        <div className="generation-settings-grid">
          <NumberField
            id="max-new-tokens"
            label="Max new tokens"
            value={props.form.maxNewTokens}
            min={1}
            max={Math.max(1, props.limits.blockSize)}
            step={1}
            onChange={(value) => changeText("maxNewTokens", value)}
          />
          <NumberField
            id="temperature"
            label="Temperature"
            value={props.form.temperature}
            min={0.1}
            max={2}
            step={0.1}
            onChange={(value) => changeText("temperature", value)}
          />
          <NumberField
            id="top-k"
            label="Top-K"
            value={props.form.topK}
            min={1}
            max={Math.max(1, props.limits.vocabSize)}
            step={1}
            onChange={(value) => changeText("topK", value)}
          />
          <label htmlFor="sampling-mode">
            <span>Mode</span>
            <select
              id="sampling-mode"
              value={props.form.mode}
              onChange={(event) =>
                props.onFormChange({
                  ...props.form,
                  mode: samplingMode(event.currentTarget.value),
                })
              }
            >
              <option value="sample">Sample</option>
              <option value="greedy">Greedy</option>
            </select>
          </label>
          <NumberField
            id="seed"
            label="Seed"
            value={props.form.seed}
            min={0}
            max={Number.MAX_SAFE_INTEGER}
            step={1}
            onChange={(value) => changeText("seed", value)}
          />
        </div>
      </details>
      {props.generation.error === null ? null : (
        <p className="generation-error" role="alert">
          {props.generation.error}
        </p>
      )}
    </section>
  );
}
