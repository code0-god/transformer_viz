import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { LearningGuide } from "./LearningGuide";
import {
  formulas,
  glossary,
  page,
  runtimeFacts,
  selectedOperations,
} from "./LearningGuide.fixture";

describe("LearningGuide", () => {
  test("aligns every outline link on the same block-start edge", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/tracks/learningGuide.css"),
      "utf8",
    );

    expect(css).toMatch(
      /\.learning-guide-outline li \+ li\s*{[^}]*margin-block-start:\s*0/s,
    );
    expect(css.indexOf(".learning-guide-outline li + li")).toBeGreaterThan(
      css.indexOf(".learning-guide li + li"),
    );
  });

  test("renders every page surface and block variant from generic models", () => {
    const { container } = render(
      <LearningGuide
        page={page}
        glossary={glossary}
        formulas={formulas}
        runtimeFacts={runtimeFacts}
        selectedOperations={selectedOperations}
        activeSectionId="fixture-section-one"
        selectedNodeId="canonical.node-one"
      />,
    );

    expect(screen.getByRole("article")).toHaveAttribute(
      "aria-labelledby",
      "fixture-guide-title",
    );
    expect(screen.getByTestId("learning-goal")).toHaveTextContent(
      "GOAL_SENTINEL",
    );
    expect(screen.getByTestId("guide-introduction")).toHaveTextContent(
      "INTRO_SENTINEL",
    );
    const outline = container.querySelector(".learning-guide-outline");
    if (outline === null) throw new Error("Fixture outline is missing");
    expect(
      screen
        .getByTestId("guide-introduction")
        .compareDocumentPosition(outline) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("RICH_STRONG").tagName).toBe("STRONG");
    expect(screen.getByText("CODE_SENTINEL").tagName).toBe("CODE");
    expect(screen.getByLabelText("INLINE_FORMULA")).toHaveAttribute(
      "role",
      "math",
    );
    expect(
      screen.getByRole("link", { name: "TERM_REFERENCE" }),
    ).toHaveAttribute("href", "#fixture-guide-glossary-fixture-term");
    expect(screen.getByText("BULLET_TITLE")).toBeVisible();
    expect(screen.getByText("STEP_TEXT")).toBeVisible();
    expect(screen.getByText("FORMULA_EXPLANATION")).toBeVisible();
    expect(screen.getByText("CALLOUT_TEXT").closest("aside")).toHaveAttribute(
      "data-guide-tone",
      "important",
    );
    expect(screen.getByText("COLUMN_ITEM")).toBeVisible();
    expect(screen.getByText("EXAMPLE_LINE").closest("pre")).toBeVisible();
    expect(screen.getAllByText("DEFINITION_SENTINEL")).toHaveLength(2);
    expect(screen.getAllByText("READY_VALUE")).toHaveLength(2);
    for (const pending of screen.getAllByText("PENDING_VALUE")) {
      expect(pending).toHaveAttribute("data-fact-status", "pending");
    }
    expect(screen.getByText("OPERATION_SUMMARY")).toBeVisible();
    expect(
      screen.getByText("구현 노트").closest("details"),
    ).not.toHaveAttribute("open");
    expect(
      screen.getByText("IMPLEMENTATION_NOTE_SENTINEL"),
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText("BLOCK_FORMULA")).toHaveLength(2);
    expect(screen.getByTestId("key-takeaway")).toHaveTextContent(
      "TAKEAWAY_SENTINEL",
    );
    expect(screen.getByTestId("guide-glossary")).toHaveTextContent(
      "DEFINITION_SENTINEL",
    );
    expect(
      container.querySelector("[data-guide-section-id='fixture-section-one']"),
    ).toHaveAttribute("data-active", "true");
    expect(container.querySelectorAll(".katex-error")).toHaveLength(0);
    expect(
      container.querySelectorAll(".learning-guide-math-scroll .katex"),
    ).not.toHaveLength(0);
  });

  test("activates the compact outline with a real heading target", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", window.location.pathname);
    render(
      <LearningGuide
        page={page}
        glossary={glossary}
        formulas={formulas}
        activeSectionId="fixture-section-one"
      />,
    );

    const outline = screen.getByRole("navigation");
    const links = within(outline).getAllByRole("link");
    expect(links.map(({ textContent }) => textContent)).toEqual([
      "SECTION_TWO",
      "SECTION_ONE",
    ]);
    expect(
      within(outline).getByRole("link", { name: "SECTION_ONE" }),
    ).toHaveAttribute("aria-current", "location");
    expect(
      document.getElementById("fixture-guide-fixture-section-two-title"),
    ).toBe(screen.getByRole("heading", { name: "SECTION_TWO" }));
    const targetLink = within(outline).getByRole("link", {
      name: "SECTION_TWO",
    });

    await user.click(targetLink);

    expect(
      screen.getByRole("heading", { name: "SECTION_TWO", level: 4 }),
    ).toHaveFocus();
    expect(window.location.hash).toBe("");
    window.history.replaceState(null, "", window.location.pathname);
  });

  test("honors explicit hidden and automatic outline policies", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <LearningGuide
        page={{ ...page, outline: "hidden" }}
        glossary={glossary}
        formulas={formulas}
      />,
    );
    expect(screen.queryByRole("navigation", { name: "학습 목차" })).toBeNull();

    rerender(
      <LearningGuide
        page={{ ...page, outline: "auto" }}
        glossary={glossary}
        formulas={formulas}
      />,
    );
    expect(screen.queryByRole("navigation", { name: "학습 목차" })).toBeNull();
    expect(screen.getByRole("heading", { name: "SECTION_ONE" })).toBeVisible();

    const sectionTemplate = page.sections[1];
    if (sectionTemplate === undefined)
      throw new Error("Fixture requires a second section");
    const additionalSections = Array.from({ length: 4 }, (_, index) => ({
      ...sectionTemplate,
      id: `fixture-section-${index + 3}`,
      title: `SECTION_${index + 3}`,
    }));
    const longSections = [...page.sections, ...additionalSections];
    rerender(
      <LearningGuide
        page={{
          ...page,
          outline: "auto",
          sections: longSections,
          outlineSectionIds: longSections.map(({ id }) => id),
        }}
        glossary={glossary}
        formulas={formulas}
      />,
    );
    await user.click(screen.getByText("이 글의 흐름"));
    expect(screen.getByRole("navigation", { name: "학습 목차" })).toBeVisible();
  });

  test("invokes native section and next-route controls with typed data", async () => {
    const user = userEvent.setup();
    const onSectionFocus = vi.fn();
    const onSectionRef = vi.fn();
    const onNavigate = vi.fn();
    render(
      <LearningGuide
        page={page}
        glossary={glossary}
        formulas={formulas}
        onSectionFocus={onSectionFocus}
        onSectionRef={onSectionRef}
        onNavigate={onNavigate}
      />,
    );

    await user.click(screen.getByRole("button", { name: "OPEN_SECTION" }));
    await user.click(screen.getByRole("button", { name: "NEXT_STEP_LABEL" }));

    expect(
      screen.getByRole("button", { name: "OPEN_SECTION" }),
    ).toHaveAttribute("aria-controls", "focused-viewer");
    expect(screen.queryByRole("button", { name: "SECTION_TWO" })).toBeNull();
    expect(onSectionFocus).toHaveBeenCalledWith(page.sections[0]);
    expect(onSectionRef).toHaveBeenCalledWith(
      "fixture-section-one",
      expect.any(HTMLElement),
    );
    expect(onNavigate).toHaveBeenCalledWith(page.nextStep);
  });

  test("shows selected operation only in the section containing the route-visible node", () => {
    const { rerender } = render(
      <LearningGuide
        page={page}
        glossary={glossary}
        formulas={formulas}
        selectedOperations={selectedOperations}
        selectedNodeId="canonical.node-one"
      />,
    );
    expect(screen.getByText("OPERATION_SUMMARY")).toBeVisible();

    for (const selectedNodeId of [
      "canonical.node-two",
      "canonical.other-route-node",
    ] as const) {
      rerender(
        <LearningGuide
          page={page}
          glossary={glossary}
          formulas={formulas}
          selectedOperations={selectedOperations}
          selectedNodeId={selectedNodeId}
        />,
      );
      expect(screen.queryByText("OPERATION_SUMMARY")).not.toBeInTheDocument();
    }
  });
});
