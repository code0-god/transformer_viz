import { TanStackDevtools } from "@tanstack/react-devtools";
import type { ReactElement } from "react";

export default function DevelopmentTools(): ReactElement {
  return (
    <TanStackDevtools
      config={{ position: "bottom-left", sourceAction: "copy-path" }}
      plugins={[]}
    />
  );
}
