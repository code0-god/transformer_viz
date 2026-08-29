import { CircleButtons } from "@designcodeio/threeui/components/CircleButtons";
import { LumenCta } from "@designcodeio/threeui/components/LumenCta";
import type { MouseEventHandler, ReactElement, ReactNode, Ref } from "react";

import "./threeUi.css";

export type ThreeUiActionProps = Readonly<{
  disabled?: boolean;
  label: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "quiet";
}>;

export function ThreeUiAction({
  disabled = false,
  label,
  onClick,
  type = "button",
  variant = "primary",
}: ThreeUiActionProps): ReactElement {
  return (
    <LumenCta
      className="threeui-action"
      disabled={disabled}
      label={label}
      mode="light"
      ring={false}
      type={type}
      variant={variant === "quiet" ? "ghost" : "primary"}
      {...(onClick === undefined ? {} : { onClick })}
    />
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
