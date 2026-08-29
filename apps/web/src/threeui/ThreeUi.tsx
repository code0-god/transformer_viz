import { LumenCta } from "@designcodeio/threeui/components/LumenCta";
import type { MouseEventHandler, ReactElement, ReactNode } from "react";

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

export function ThreeUiProvider({
  children,
}: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <div className="threeui-root" data-threeui-theme="canonical">
      {children}
    </div>
  );
}
