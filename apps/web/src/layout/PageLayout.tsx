import type { ReactElement } from "react";

import "./pageLayout.css";

type BoundaryKind = "structural" | "content" | "internal";

type PageDividerProps = Readonly<{
  boundaryId: string;
  kind?: BoundaryKind;
  className?: string;
}>;

export function PageDivider({
  boundaryId,
  kind = "structural",
  className,
}: PageDividerProps): ReactElement {
  const span =
    kind === "structural"
      ? "page-layout__full"
      : kind === "content"
        ? "page-layout__content"
        : "";

  return (
    <div
      className={["ui-boundary", `ui-boundary--${kind}`, span, className]
        .filter(Boolean)
        .join(" ")}
      data-boundary-id={boundaryId}
      data-boundary-kind={kind}
      aria-hidden="true"
    />
  );
}
