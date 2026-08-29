import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";

import "katex/dist/katex.min.css";
import "../style.css";
import "./architecture/architecture.css";
import { App } from "./App";
import { ThreeUiProvider } from "./threeui/ThreeUi";

if (import.meta.env.DEV) {
  void import("react-grab");
}

const DevelopmentTools = import.meta.env.DEV
  ? lazy(() => import("./dev/DevelopmentTools"))
  : null;

const container = document.getElementById("root");

if (container === null) {
  throw new Error("React root container is missing");
}

createRoot(container).render(
  <StrictMode>
    <ThreeUiProvider>
      <App />
      {DevelopmentTools === null ? null : (
        <Suspense fallback={null}>
          <DevelopmentTools />
        </Suspense>
      )}
    </ThreeUiProvider>
  </StrictMode>,
);
