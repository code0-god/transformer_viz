import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { describe, expect, test } from "vitest";

import { App } from "../../../../../App";
import { model, TestWorker } from "../../../../../test/workerFixtures";

const CHAPTERS = [
  ["자연어 처리란?", "자연어 처리 추론 경로"],
  ["Token이란?", "Token 경계 비교"],
  ["Vocabulary와 Token ID", "Vocabulary 주소와 순서"],
  ["Tokenization 방식", "Tokenization 방식의 정성 비교"],
] as const;

const BEGINNER_STAGE_LABELS = [
  "사람이 쓰는 텍스트",
  "숫자로 표현하기",
  "모델의 계산",
  "사람이 사용하는 결과",
] as const;

const FORBIDDEN_STAGE_LABELS = [
  "Tokenizer",
  "Token IDs",
  "Logits",
  "Softmax",
  "Sampling",
] as const;

function readyCurriculum(): TestWorker {
  window.history.replaceState(
    null,
    "",
    "/#/learn/decoder-only-fundamentals/0-1",
  );
  const worker = new TestWorker();
  render(
    <StrictMode>
      <App
        createWorker={() => worker}
        manifestUrl="https://example.test/models/edu/manifest.json"
      />
    </StrictMode>,
  );
  act(() => worker.emit({ type: "ready", model }));
  return worker;
}

describe("Part 0 curriculum Diagrams", () => {
  test.each(CHAPTERS)(
    "renders %s as one named SVG with fallback and native focus control",
    async (chapterTitle, imageName) => {
      // Given: a ready curriculum and unchanged Worker message count.
      const worker = readyCurriculum();
      const user = userEvent.setup();
      const postsBefore = worker.posted.length;
      await user.click(screen.getByRole("button", { name: "목차 열기" }));

      // When: the Chapter is selected through the real ToC.
      await user.click(
        within(
          screen.getByRole("navigation", { name: "Chapter 목차" }),
        ).getByRole("link", {
          name: new RegExp(chapterTitle.replace("?", "\\?")),
        }),
      );

      // Then: semantic Diagram structure is complete without Worker traffic.
      const pane = document.querySelector("#learning-diagram-pane");
      expect(pane).not.toBeNull();
      if (!(pane instanceof HTMLElement))
        throw new Error("Missing Diagram pane");
      expect(
        pane.querySelector(`svg[aria-label='${imageName}']`),
      ).not.toBeNull();
      expect(within(pane).getAllByRole("img")).toHaveLength(1);
      expect(
        within(pane).getByRole("img", { name: imageName }),
      ).toBeInTheDocument();
      expect(
        within(pane).getByRole("group", { name: `${chapterTitle} 의미 설명` }),
      ).toBeInTheDocument();
      const focusButton = within(pane).getByRole("button", {
        name:
          chapterTitle === "자연어 처리란?"
            ? "개념 설명으로 이동"
            : "개념 설명에 초점",
      });
      await user.click(focusButton);
      expect(screen.getByTestId("guide-introduction")).toHaveFocus();
      expect(worker.posted).toHaveLength(postsBefore);
      expect(within(pane).queryByRole("slider")).toBeNull();
      expect(within(pane).queryByRole("switch")).toBeNull();
    },
  );

  test("renders Chapter 0.1 as four conceptual stages only", async () => {
    // Given: a ready curriculum and the Part 0 Chapter 0.1 entrypoint.
    readyCurriculum();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "목차 열기" }));

    // When: Chapter 0.1 is selected through the real ToC.
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Chapter 목차" }),
      ).getByRole("link", {
        name: /자연어 처리란\?/,
      }),
    );

    // Then: the SVG, fallback, and focus control stay present while the stage flow stays small.
    const pane = document.querySelector("#learning-diagram-pane");
    expect(pane).not.toBeNull();
    if (!(pane instanceof HTMLElement)) throw new Error("Missing Diagram pane");
    const stageLabels = Array.from(pane.querySelectorAll("[data-stage]")).map(
      (stage) => stage.getAttribute("data-stage") ?? "",
    );
    expect(stageLabels).toEqual(BEGINNER_STAGE_LABELS);
    expect(within(pane).getAllByRole("img")).toHaveLength(1);
    expect(
      within(pane).getByRole("img", { name: "자연어 처리 추론 경로" }),
    ).toBeInTheDocument();
    expect(
      within(pane).getByRole("group", { name: "자연어 처리란? 의미 설명" }),
    ).toBeInTheDocument();
    expect(
      within(pane)
        .getAllByRole("listitem")
        .map((item) => item.textContent ?? ""),
    ).toEqual(BEGINNER_STAGE_LABELS);
    for (const forbidden of FORBIDDEN_STAGE_LABELS) {
      expect(stageLabels).not.toContain(forbidden);
      expect(pane.textContent).not.toContain(forbidden);
    }
    const focusButton = within(pane).getByRole("button", {
      name: "개념 설명으로 이동",
    });
    await user.click(focusButton);
    expect(screen.getByTestId("guide-introduction")).toHaveFocus();
  });

  test("keeps the current-runtime badge on the byte method only", async () => {
    // Given: the Tokenization methods Chapter.
    readyCurriculum();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "목차 열기" }));

    // When: Chapter 0.4 is selected.
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Chapter 목차" }),
      ).getByRole("link", { name: /Tokenization 방식/ }),
    );

    // Then: exactly the runtime byte row owns the machine badge.
    const badges = document.querySelectorAll("[data-current-runtime='true']");
    expect(badges).toHaveLength(1);
    expect(badges[0]?.getAttribute("data-tokenization-method")).toBe("byte");
  });
});
