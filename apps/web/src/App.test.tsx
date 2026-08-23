import { render, screen } from "@testing-library/react";

import { App } from "./App";

describe("React shipping shell", () => {
  test("renders one application main landmark", () => {
    render(<App />);

    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});
