import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "katex/dist/katex.min.css";
import "../style.css";
import "./architecture/architecture.css";
import { App } from "./App";

const container = document.getElementById("root");

if (container === null) {
  throw new Error("React root container is missing");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
