import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { SceneChoiceGroup, SceneStepRail } from "./sceneControls";

describe("SceneStepRail", () => {
  test("exposes compact native step and replay controls", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onReplay = vi.fn();

    render(
      <SceneStepRail
        activeStep="lookup"
        label="Embedding 단계"
        onReplay={onReplay}
        onSelect={onSelect}
        replayLabel="다시 보기"
        steps={[
          { id: "id", label: "ID" },
          { id: "lookup", label: "Row" },
          { id: "vector", label: "Vector" },
        ]}
      />,
    );

    expect(
      screen.getByRole("group", { name: "Embedding 단계" }),
    ).toHaveAttribute("data-threeui-control", "scene-step-rail");
    expect(screen.getByRole("button", { name: "Row" })).toHaveAttribute(
      "aria-current",
      "step",
    );

    await user.click(screen.getByRole("button", { name: "Vector" }));
    expect(onSelect).toHaveBeenCalledWith("vector");

    await user.click(screen.getByRole("button", { name: "다시 보기" }));
    expect(onReplay).toHaveBeenCalledOnce();
  });

  test("exposes compact native scene choices", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <SceneChoiceGroup
        label="Tokenizer mode"
        onSelect={onSelect}
        selected="byte"
        choices={[
          { id: "word", label: "Word" },
          { id: "byte", label: "Current Byte" },
        ]}
      />,
    );

    expect(
      screen.getByRole("group", { name: "Tokenizer mode" }),
    ).toHaveAttribute("data-threeui-control", "scene-choice-group");
    expect(
      screen.getByRole("button", { name: "Current Byte" }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Word" }));
    expect(onSelect).toHaveBeenCalledWith("word");
  });
});
