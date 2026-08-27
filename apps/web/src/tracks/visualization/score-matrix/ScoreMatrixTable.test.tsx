import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import type { ScoreMatrixModel } from "../scoreMatrixModel";
import { ScoreMatrixTable } from "./ScoreMatrixTable";

const model: ScoreMatrixModel = {
  layer: 3,
  head: 1,
  size: 2,
  queryTokenLabels: ["질문", "답"],
  keyTokenLabels: ["키", "값"],
  cells: [
    {
      queryIndex: 0,
      keyIndex: 0,
      queryTokenLabel: "질문",
      keyTokenLabel: "키",
      value: -0,
      allowed: true,
      blockedByLaterCausalMask: false,
    },
    {
      queryIndex: 0,
      keyIndex: 1,
      queryTokenLabel: "질문",
      keyTokenLabel: "값",
      value: 0.125,
      allowed: false,
      blockedByLaterCausalMask: true,
    },
    {
      queryIndex: 1,
      keyIndex: 0,
      queryTokenLabel: "답",
      keyTokenLabel: "키",
      value: -3.5,
      allowed: true,
      blockedByLaterCausalMask: false,
    },
    {
      queryIndex: 1,
      keyIndex: 1,
      queryTokenLabel: "답",
      keyTokenLabel: "값",
      value: 9.25,
      allowed: true,
      blockedByLaterCausalMask: false,
    },
  ],
};

describe("ScoreMatrixTable", () => {
  test("exposes exact values with query row and key column headers", () => {
    // Given: exact score values and distinct query/key labels.
    // When: the accessible fallback table renders.
    render(<ScoreMatrixTable model={model} selectedCellKey={null} />);

    // Then: caption, scoped headers, and exact source values are present.
    const table = screen.getByRole("table", { name: /Layer 4, Head 2/ });
    expect(within(table).getByText("-0")).toBeVisible();
    expect(within(table).getByText("0.125")).toBeVisible();
    expect(within(table).getByText("-3.5")).toBeVisible();
    expect(within(table).getByText("9.25")).toBeVisible();
    expect(
      within(table).getByRole("columnheader", { name: "키 0: 키" }),
    ).toHaveAttribute("scope", "col");
    expect(
      within(table).getByRole("rowheader", { name: "질의 1: 답" }),
    ).toHaveAttribute("scope", "row");
  });

  test("states causal masking and summarizes the selected exact cell", () => {
    // Given: one later-key masked cell selected by its stable key.
    // When: the table renders the persistent selection.
    render(<ScoreMatrixTable model={model} selectedCellKey="0:1" />);

    // Then: the cell and summary expose mask provenance without relying on color.
    const selected = screen.getByRole("cell", {
      name: "질의 0 질문, 키 1 값: 0.125, 이후 토큰 인과 마스크로 차단됨",
    });
    expect(selected).toHaveAttribute("data-selected", "true");
    expect(screen.getByRole("status")).toHaveTextContent(
      "선택: 질의 0 질문, 키 1 값, 점수 0.125, 이후 토큰 인과 마스크로 차단됨",
    );
  });

  test("lets keyboard users persist a cell selection", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ScoreMatrixTable
        model={model}
        selectedCellKey={null}
        onSelect={onSelect}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "질의 0 질문, 키 1 값: 0.125, 이후 토큰 인과 마스크로 차단됨",
      }),
    );

    expect(onSelect).toHaveBeenCalledWith("0:1");
  });

  test("owns horizontal overflow locally", () => {
    // Given: a matrix table that may exceed its container.
    // When: it renders.
    const { container } = render(
      <ScoreMatrixTable model={model} selectedCellKey={null} />,
    );

    // Then: its immediate region declares local horizontal scrolling.
    expect(container.firstElementChild).toHaveClass(
      "score-matrix-table-scroll",
    );
  });
});
