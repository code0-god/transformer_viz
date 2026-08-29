import { render, screen } from "@testing-library/react";

import { Header } from "./Header";

describe("global Header", () => {
  test("keeps the global surface compact and route-aware", () => {
    const { container } = render(
      <Header status={{ type: "ready" }} activeView="learn" />,
    );

    expect(
      container.querySelector('[data-threeui-surface="shell"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "주요 탐색" }),
    ).toHaveAttribute("data-threeui-control", "mode-navigation");
    expect(
      screen.getByRole("link", { name: "Transformer Viz" }),
    ).toHaveAttribute("data-threeui-control", "brand");
    const learn = screen.getByRole("link", { name: "학습" });
    expect(learn).toHaveAttribute("aria-current", "page");
    expect(learn).toHaveAttribute("data-control-state", "selected");
    expect(screen.getByRole("link", { name: "모델 실험실" })).toHaveAttribute(
      "data-control-state",
      "idle",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Ready");
    expect(screen.getByRole("status")).toHaveAttribute(
      "data-threeui-status",
      "ready",
    );
    expect(screen.getByRole("status")).toHaveAttribute(
      "data-threeui-control",
      "status",
    );
  });

  test("announces and renders the worker error detail", () => {
    render(
      <Header
        status={{ type: "error", message: "WORKER_ERROR_SENTINEL" }}
        activeView="lab"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Model Error");
    expect(screen.getByRole("alert")).toHaveAccessibleDescription(
      "WORKER_ERROR_SENTINEL",
    );
    expect(screen.getByText("WORKER_ERROR_SENTINEL")).toBeVisible();
    expect(screen.getByRole("link", { name: "모델 실험실" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
