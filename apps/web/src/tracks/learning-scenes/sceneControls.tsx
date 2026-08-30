import type { CSSProperties, ReactElement, ReactNode } from "react";

import { ThreeUiAction } from "../../threeui/ThreeUi";

type SceneStep<Id extends string> = Readonly<{
  id: Id;
  label: string;
}>;

export function SceneChoiceGroup<Id extends string>({
  choices,
  label,
  onSelect,
  selected,
}: Readonly<{
  choices: readonly SceneStep<Id>[];
  label: string;
  onSelect: (choice: Id) => void;
  selected: Id;
}>): ReactElement {
  return (
    <fieldset
      className="scene-choice-group"
      data-threeui-control="scene-choice-group"
    >
      <legend>{label}</legend>
      {choices.map((choice) => (
        <button
          key={choice.id}
          type="button"
          aria-pressed={choice.id === selected}
          onClick={() => onSelect(choice.id)}
        >
          {choice.label}
        </button>
      ))}
    </fieldset>
  );
}

export function SceneStepRail<Id extends string>({
  activeStep,
  label,
  onReplay,
  onSelect,
  replayLabel,
  steps,
}: Readonly<{
  activeStep: Id;
  label: string;
  onReplay?: () => void;
  onSelect: (step: Id) => void;
  replayLabel?: string;
  steps: readonly SceneStep<Id>[];
}>): ReactElement {
  return (
    <fieldset
      className="scene-step-rail"
      data-threeui-control="scene-step-rail"
    >
      <legend>{label}</legend>
      <ol>
        {steps.map((step, index) => {
          const current = step.id === activeStep;
          return (
            <li key={step.id} data-current={current ? "true" : undefined}>
              <button
                type="button"
                aria-current={current ? "step" : undefined}
                aria-pressed={current}
                onClick={() => onSelect(step.id)}
              >
                <span aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {step.label}
              </button>
            </li>
          );
        })}
      </ol>
      {onReplay === undefined || replayLabel === undefined ? null : (
        <ThreeUiAction label={replayLabel} onClick={onReplay} tier="tertiary" />
      )}
    </fieldset>
  );
}

type SceneStageLabelStyle = CSSProperties & {
  readonly "--scene-label-mobile-x": `${number}%`;
  readonly "--scene-label-mobile-y": `${number}%`;
  readonly "--scene-label-x": `${number}%`;
  readonly "--scene-label-y": `${number}%`;
};

export function SceneStageLabel({
  children,
  className,
  x,
  y,
  mobileX = x,
  mobileY = y,
  tone = "neutral",
}: Readonly<{
  children: ReactNode;
  className?: string;
  mobileX?: number;
  mobileY?: number;
  tone?: "neutral" | "selected" | "output";
  x: number;
  y: number;
}>): ReactElement {
  const style: SceneStageLabelStyle = {
    "--scene-label-mobile-x": `${mobileX}%`,
    "--scene-label-mobile-y": `${mobileY}%`,
    "--scene-label-x": `${x}%`,
    "--scene-label-y": `${y}%`,
  };
  return (
    <span
      className={["scene-stage-label", className].filter(Boolean).join(" ")}
      data-tone={tone}
      style={style}
    >
      {children}
    </span>
  );
}
