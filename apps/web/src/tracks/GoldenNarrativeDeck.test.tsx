import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";

import type { GuideVisualNarrativeBlock } from "./guideTypes";
import type { LearningFigureRegistry } from "./learningFigureTypes";
import { useVisualNarrative, VisualNarrative } from "./VisualNarrative";

const block = {
  id: "fixture-golden-deck",
  kind: "visual-narrative",
  layout: "golden",
  label: "Fixture Golden deck",
  beats: [
    {
      id: "language",
      label: "사람이 읽는 언어",
      stage: "language",
      text: "LANGUAGE",
    },
    {
      id: "numeric",
      label: "계산 가능한 표현",
      stage: "numeric",
      text: "NUMERIC",
    },
    {
      id: "transform",
      label: "모델 계산",
      stage: "transform",
      text: "TRANSFORM",
    },
    { id: "result", label: "결과", stage: "result", text: "RESULT" },
    {
      id: "token-preview",
      label: "다음 질문",
      stage: "token-preview",
      text: "TOKEN",
    },
  ],
  figure: {
    id: "fixture-golden-figure",
    kind: "figure",
    figureId: "fixture.golden",
    caption: "Fixture caption",
    alt: "Fixture visual",
  },
} as const satisfies GuideVisualNarrativeBlock;

function DeckProbe(): ReactElement {
  const narrative = useVisualNarrative();
  return (
    <>
      <output data-testid="deck-probe" data-stage={narrative?.activeStage} />
      <input aria-label="편집 입력" />
      <textarea aria-label="편집 영역" />
      <select aria-label="편집 선택">
        <option>fixture</option>
      </select>
      <div contentEditable data-testid="편집 가능 영역" />
    </>
  );
}

const registry: LearningFigureRegistry = {
  figureIds: new Set(["fixture.golden"]),
  metadata: () => ({
    preferredWidth: 720,
    renderer: "static",
  }),
  preferredWidth: () => 720,
  render: () => <DeckProbe />,
};

function renderDeck() {
  const user = userEvent.setup();
  const result = render(<VisualNarrative block={block} registry={registry} />);
  return { ...result, user };
}

describe("Golden Narrative deck", () => {
  test("starts deterministically on one visible first slide", () => {
    // Given/When: Chapter 0.1 mounts.
    renderDeck();

    // Then: one slide owns the stable stage and Previous is bounded.
    const deck = screen.getByRole("region", { name: block.label });
    expect(deck).toHaveAttribute("data-narrative-mode", "deck");
    expect(deck).toHaveAttribute("data-narrative-stage", "language");
    expect(deck.querySelectorAll(".visual-narrative__beat")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "이전 단계" })).toBeDisabled();
    expect(screen.getByText("1 / 5")).toBeVisible();
  });

  test("advances and reverses with compact controls", async () => {
    // Given: the first slide is active.
    const { user } = renderDeck();

    // When: learner advances once, then returns once.
    await user.click(screen.getByRole("button", { name: "다음 단계" }));
    expect(screen.getByTestId("deck-probe")).toHaveAttribute(
      "data-stage",
      "numeric",
    );
    await user.click(screen.getByRole("button", { name: "이전 단계" }));

    // Then: the same stage returns to the deterministic first state.
    expect(screen.getByTestId("deck-probe")).toHaveAttribute(
      "data-stage",
      "language",
    );
  });

  test("uses ArrowRight and ArrowLeft inside deck controls", async () => {
    // Given: one deck control receives keyboard focus.
    const { user } = renderDeck();
    screen.getByRole("button", { name: "다음 단계" }).focus();

    // When: learner presses ArrowRight inside the deck.
    await user.keyboard("{ArrowRight}");

    // Then: slide advances and ArrowLeft reverses it.
    expect(screen.getByTestId("deck-probe")).toHaveAttribute(
      "data-stage",
      "numeric",
    );
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByTestId("deck-probe")).toHaveAttribute(
      "data-stage",
      "language",
    );
  });

  test.each([
    ["input", () => screen.getByRole("textbox", { name: "편집 입력" })],
    ["textarea", () => screen.getByRole("textbox", { name: "편집 영역" })],
    ["select", () => screen.getByRole("combobox", { name: "편집 선택" })],
    ["contenteditable", () => screen.getByTestId("편집 가능 영역")],
  ])("does not intercept arrows from %s", (_name, target) => {
    // Given: an editable descendant owns focus.
    renderDeck();
    target().focus();

    // When: ArrowRight is dispatched from that editable surface.
    fireEvent.keyDown(target(), { key: "ArrowRight" });

    // Then: deck state remains unchanged.
    expect(screen.getByTestId("deck-probe")).toHaveAttribute(
      "data-stage",
      "language",
    );
  });

  test("does not wrap beyond either deck boundary", async () => {
    // Given: learner selects the final progress dot.
    const { user } = renderDeck();
    await user.click(screen.getByRole("button", { name: "5단계: 다음 질문" }));

    // When/Then: Next is disabled and state remains final.
    expect(screen.getByRole("button", { name: "다음 단계" })).toBeDisabled();
    expect(screen.getByTestId("deck-probe")).toHaveAttribute(
      "data-stage",
      "token-preview",
    );
  });

  test("exposes current step semantics through compact progress", async () => {
    // Given: the progress control is rendered.
    const { user } = renderDeck();
    const progress = screen.getByRole("navigation", {
      name: `${block.label} 단계`,
    });

    // When: learner selects the third semantic step.
    await user.click(
      within(progress).getByRole("button", { name: "3단계: 모델 계산" }),
    );

    // Then: exactly one step is current and count is synchronized.
    expect(
      within(progress).getAllByRole("button", { current: "step" }),
    ).toHaveLength(1);
    expect(screen.getByText("3 / 5")).toBeVisible();
  });

  test("keeps the visual object mounted without browser history writes", async () => {
    // Given: one persistent visual and current URL.
    const { user } = renderDeck();
    const visual = screen.getByTestId("deck-probe");
    const hash = window.location.hash;
    const historyWrite = vi.spyOn(window.history, "pushState");

    // When: learner advances.
    await user.click(screen.getByRole("button", { name: "다음 단계" }));

    // Then: identity and route history remain unchanged.
    expect(screen.getByTestId("deck-probe")).toBe(visual);
    expect(window.location.hash).toBe(hash);
    expect(historyWrite).not.toHaveBeenCalled();
    historyWrite.mockRestore();
  });

  test("resets to slide one after a real remount", async () => {
    // Given: an advanced deck is unmounted.
    const first = renderDeck();
    await first.user.click(screen.getByRole("button", { name: "다음 단계" }));
    first.unmount();

    // When: Chapter deck mounts again.
    renderDeck();

    // Then: initial slide contract is deterministic.
    expect(screen.getByTestId("deck-probe")).toHaveAttribute(
      "data-stage",
      "language",
    );
  });
});
