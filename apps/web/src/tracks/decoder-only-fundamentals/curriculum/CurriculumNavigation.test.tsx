import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { CurriculumChapterFooter } from "./CurriculumChapterFooter";
import { CurriculumNavigation } from "./CurriculumNavigation";
import { CHAPTER_IDS } from "./ids";
import { chapterNavigation } from "./navigation";

function renderNavigation(index = 6) {
  const onNavigate = vi.fn();
  render(
    <CurriculumNavigation
      currentChapterId={CHAPTER_IDS[index] ?? CHAPTER_IDS[0]}
      onNavigate={onNavigate}
    />,
  );
  return onNavigate;
}

function renderFooter(index = 6) {
  const onNavigate = vi.fn();
  const navigation = chapterNavigation(CHAPTER_IDS[index] ?? CHAPTER_IDS[0]);
  render(
    <CurriculumChapterFooter
      previous={navigation?.previous}
      next={navigation?.next}
      chapterHref={(chapterId) => `#/test/${chapterId}`}
      onNavigate={onNavigate}
    />,
  );
  return onNavigate;
}

describe("Curriculum Navigation disclosure", () => {
  test("opens a non-modal table of contents only from its header button", async () => {
    // Given: the curriculum header is rendered in its default state.
    const user = userEvent.setup();
    renderNavigation();

    // Then: no permanent sidebar, modal, or Chapter list is mounted.
    expect(
      screen.queryByRole("navigation", { name: "Chapter 목차" }),
    ).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();

    // When: the native header disclosure button is activated by keyboard.
    const opener = screen.getByRole("button", { name: "목차 열기" });
    opener.focus();
    await user.keyboard("{Enter}");

    // Then: one non-modal list exposes exactly 14 native Chapter buttons.
    const toc = screen.getByRole("navigation", { name: "Chapter 목차" });
    expect(within(toc).getAllByRole("button")).toHaveLength(14);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveAttribute("aria-expanded", "true");
  });

  test("marks one current Chapter without duplicate ordinal progress", async () => {
    // Given: Chapter 7 is current.
    const user = userEvent.setup();
    renderNavigation(6);

    // When: the ToC is opened.
    await user.click(screen.getByRole("button", { name: "목차 열기" }));

    // Then: one item is current and the header owns the only ordinal.
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(screen.queryByText("현재 Chapter 7 / 14")).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  test("emits explicit selection for the already-current ToC Chapter", async () => {
    // Given: Chapter 0.1 is current and its ToC item is visible.
    const user = userEvent.setup();
    const onNavigate = renderNavigation(0);
    await user.click(screen.getByRole("button", { name: "목차 열기" }));

    // When: the current native Chapter button is clicked.
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Chapter 목차" }),
      ).getByRole("button", { name: "자연어 처리란?" }),
    );

    // Then: current identity does not suppress explicit activation.
    expect(onNavigate).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith(CHAPTER_IDS[0]);
  });

  test("keeps adjacent routes out of compact Chapter header", () => {
    renderNavigation(6);

    expect(screen.queryByRole("button", { name: /^이전:/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^다음:/ })).toBeNull();
  });

  test("uses destination-named native footer links", async () => {
    // Given: a middle Chapter is current.
    const user = userEvent.setup();
    const onNavigate = renderFooter(6);

    // When: the destination-named next link is clicked.
    await user.click(
      screen.getByRole("link", { name: "다음: Autoregressive Generation" }),
    );

    // Then: ordered navigation emits that destination Chapter.
    expect(
      screen.getByRole("link", { name: "이전: 다음 Token 예측" }),
    ).toBeInTheDocument();
    expect(onNavigate).toHaveBeenCalledWith(CHAPTER_IDS[7]);
  });

  test("omits footer boundary controls instead of disabled placeholders", () => {
    // Given/When: the first Chapter is current.
    renderFooter(0);

    // Then: previous is absent and no disabled placeholder exists.
    expect(screen.queryByRole("link", { name: /^이전:/ })).toBeNull();
    expect(
      screen.getByRole("link", { name: "다음: Token이란?" }),
    ).toHaveAttribute("href", "#/test/decoder.chapter.0.2");
    expect(
      screen.queryByRole("button", { name: "이전 Chapter 없음" }),
    ).toBeNull();
  });

  test("renders no Visualization mode or CTA for the absent capability", () => {
    // Given/When: a Chapter without visualizationId is rendered.
    renderNavigation();

    // Then: no mode, tab, toggle, CTA, or placeholder enters the DOM.
    expect(screen.queryByText(/Visualization/)).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
  });

  test("rejects a two-current mutant", async () => {
    // Given: a valid navigation render.
    const user = userEvent.setup();
    renderNavigation();
    await user.click(screen.getByRole("button", { name: "목차 열기" }));
    const toc = screen.getByRole("navigation", { name: "Chapter 목차" });

    // When: the machine-consumed invariant is evaluated.
    const currentCount = within(toc)
      .getAllByRole("button")
      .filter(
        (button) => button.getAttribute("aria-current") === "page",
      ).length;

    // Then: only one current item is accepted.
    expect(currentCount).toBe(1);
  });
});
