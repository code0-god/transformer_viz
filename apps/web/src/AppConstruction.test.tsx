import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("production React Worker construction", () => {
  test("surfaces a synchronous Worker construction error", () => {
    render(
      <App
        createWorker={() => {
          throw new Error("WORKER_CONSTRUCTION_SENTINEL");
        }}
        manifestUrl="https://example.test/models/edu/manifest.json"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "WORKER_CONSTRUCTION_SENTINEL",
    );
    expect(document.getElementById("status")).toHaveAttribute(
      "data-status",
      "error",
    );
  });
});
