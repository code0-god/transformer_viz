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
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "학습" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "모델 실험실" }),
    ).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("status")).toHaveTextContent("Model Ready");
    expect(screen.getByRole("status")).toHaveAttribute(
      "data-threeui-status",
      "ready",
    );
  });

  test("announces a worker error without expanding the global copy", () => {
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
    expect(screen.getByRole("link", { name: "모델 실험실" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
