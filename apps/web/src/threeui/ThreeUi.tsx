import { CircleButtons } from "@designcodeio/threeui/components/CircleButtons";
import { LumenCta } from "@designcodeio/threeui/components/LumenCta";
import {
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
  type Ref,
  useLayoutEffect,
  useRef,
} from "react";

import "./threeUi.css";

export type ThreeUiActionProps = Readonly<{
  busy?: boolean;
  disabled?: boolean;
  label: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  state?: "idle" | "working" | "stopping" | "error";
  testId?: string;
  tier?: "primary" | "secondary" | "tertiary";
  type?: "button" | "submit" | "reset";
}>;

export function ThreeUiAction({
  busy = false,
  disabled = false,
  label,
  onClick,
  state = "idle",
  testId,
  tier = "primary",
  type = "button",
}: ThreeUiActionProps): ReactElement {
  const hostRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const action = hostRef.current?.querySelector("button");
    if (action === undefined || action === null) return;
    action.setAttribute("aria-busy", String(busy));
    if (testId === undefined) action.removeAttribute("data-testid");
    else action.setAttribute("data-testid", testId);
  }, [busy, testId]);

  return (
    <span
      ref={hostRef}
      className="threeui-action-host"
      data-control-state={state}
      data-control-tier={tier}
      aria-busy={busy}
    >
      <LumenCta
        brightness={0.84}
        className="threeui-action"
        disabled={disabled}
        hue={-106}
        label={label}
        mode="light"
        ring={tier === "primary"}
        saturation={0.58}
        type={type}
        variant={tier === "primary" ? "primary" : "ghost"}
        {...(onClick === undefined ? {} : { onClick })}
      />
    </span>
  );
}

export type ThreeUiIconActionProps = Readonly<{
  ariaLabel: string;
  containerRef?: Ref<HTMLSpanElement>;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
}>;

export function ThreeUiIconAction({
  ariaLabel,
  containerRef,
  disabled = false,
  onClick,
  type = "button",
}: ThreeUiIconActionProps): ReactElement {
  return (
    <span ref={containerRef} className="threeui-icon-action-host">
      <CircleButtons
        ariaLabel={ariaLabel}
        className="threeui-icon-action"
        disabled={disabled}
        mode="light"
        type={type}
        variant="plus"
        {...(onClick === undefined ? {} : { onClick })}
      />
    </span>
  );
}

export function ThreeUiProvider({
  children,
}: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <div className="threeui-root" data-threeui-theme="canonical">
      {children}
    </div>
  );
}
