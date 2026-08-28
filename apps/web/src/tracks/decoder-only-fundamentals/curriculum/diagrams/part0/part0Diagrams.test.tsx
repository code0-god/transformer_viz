import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { describe, expect, test } from "vitest";

import { App } from "../../../../../App";
import { model, TestWorker } from "../../../../../test/workerFixtures";
import { TokenComparisonDiagram } from "./TokenComparisonDiagram";

const CHAPTERS = [
  ["자연어 처리란?", "자연어 처리 추론 경로"],
  ["Token이란?", "Token 개념 흐름"],
  ["Vocabulary와 Token ID", "Vocabulary 주소와 순서"],
  ["Tokenization 방식", "Tokenization 방식 비교"],
] as const;

const INLINE_CHAPTERS = [
  [
    "자연어 처리란?",
    "decoder.diagram.intro.nlp",
    "자연어 처리 추론 경로",
    "자연어 처리는 텍스트를 숫자로 표현해 계산하고, 그 결과를 사람이 사용하는 형태로 바꿉니다.",
  ],
  [
    "Token이란?",
    "decoder.diagram.tokenization.token",
    "Token 개념 흐름",
    "Token의 경계는 사용하는 tokenizer에 따라 달라질 수 있습니다.",
  ],
  [
    "Vocabulary와 Token ID",
    "decoder.diagram.tokenization.vocabulary",
    "Vocabulary 주소와 순서",
    "Token ID는 vocabulary에서 token을 찾는 주소이며, 의미 계산은 embedding vector에서 시작합니다.",
  ],
  [
    "Tokenization 방식",
    "decoder.diagram.tokenization.methods",
    "Tokenization 방식 비교",
    "같은 텍스트도 tokenization 방식에 따라 경계, vocabulary 크기, sequence 길이가 달라집니다.",
  ],
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
  test.each(INLINE_CHAPTERS)(
    "renders %s Figure inline without a Learn overlay trigger",
    async (chapterTitle, figureId, imageName, caption) => {
      const worker = readyCurriculum();
      const user = userEvent.setup();
      const postsBefore = worker.posted.length;
      await user.click(screen.getByRole("button", { name: "목차 열기" }));
      await user.click(
        within(
          screen.getByRole("navigation", { name: "Chapter 목차" }),
        ).getByRole("link", {
          name: new RegExp(chapterTitle.replace("?", "\\?")),
        }),
      );

      const figure = document.querySelector(`[data-figure-id='${figureId}']`);
      expect(figure).not.toBeNull();
      if (!(figure instanceof HTMLElement))
        throw new Error("Inline Figure is missing");
      expect(
        within(figure).getByRole("img", { name: imageName }),
      ).toBeVisible();
      expect(within(figure).getByText(caption).tagName).toBe("FIGCAPTION");
      expect(screen.queryByTestId("open-diagram-viewer")).toBeNull();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(worker.posted).toHaveLength(postsBefore);
    },
  );

  test("renders the Token concept as direct segmented text", () => {
    const originalMatchMedia = window.matchMedia;
    const mobileQuery = {
      matches: true,
      media: "(max-width: 44rem)",
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => true,
    } satisfies MediaQueryList;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => mobileQuery,
    });

    try {
      const { container } = render(<TokenComparisonDiagram />);
      expect(
        screen.getByRole("img", { name: "Token 개념 흐름" }),
      ).toBeVisible();
      expect(container.querySelectorAll("[data-token-segment]")).toHaveLength(
        5,
      );
      expect(container.querySelectorAll("[data-token-boundary]")).toHaveLength(
        4,
      );
      expect(
        new Set(
          Array.from(container.querySelectorAll("[data-token-row]")).map(
            (segment) => segment.getAttribute("data-token-row"),
          ),
        ),
      ).toEqual(new Set(["1", "2"]));
      expect(container.querySelector("[data-token-stage]")).toBeNull();
      expect(container.querySelector("marker")).toBeNull();
      expect(container.querySelector("[data-token-lens]")).toBeNull();
    } finally {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: originalMatchMedia,
      });
    }
  });

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
      // Then: semantic Figure structure is already complete without Worker traffic.
      const image = screen.getByRole("img", { name: imageName });
      const pane = image.closest("figure");
      expect(pane).not.toBeNull();
      if (!(pane instanceof HTMLElement))
        throw new Error("Missing inline Figure");
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
      expect(
        within(pane).queryByRole("button", { name: /개념 설명/ }),
      ).toBeNull();
      expect(pane.querySelector(":scope > figcaption")).not.toBeNull();
      expect(worker.posted).toHaveLength(postsBefore);
      expect(within(pane).queryByRole("slider")).toBeNull();
      expect(within(pane).queryByRole("switch")).toBeNull();
      expect(screen.queryByRole("dialog")).toBeNull();
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
    // Then: the inline SVG and fallback stay present without viewer chrome.
    const image = screen.getByRole("img", {
      name: "자연어 처리 추론 경로",
    });
    const pane = image.closest("figure");
    expect(pane).not.toBeNull();
    if (!(pane instanceof HTMLElement))
      throw new Error("Missing inline Figure");
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
    expect(
      within(pane).queryByRole("button", { name: /개념 설명/ }),
    ).toBeNull();
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
    // Then: exactly the runtime byte row owns the machine badge inline.
    const badges = document.querySelectorAll("[data-current-runtime='true']");
    expect(badges).toHaveLength(1);
    expect(badges[0]?.getAttribute("data-tokenization-method")).toBe("byte");
    expect(
      document.querySelectorAll("[data-tokenization-example]"),
    ).toHaveLength(4);
    expect(
      Array.from(document.querySelectorAll("td[data-label]")).map((cell) =>
        cell.getAttribute("data-label"),
      ),
    ).toEqual([
      "예시",
      "Vocabulary",
      "Sequence",
      "예시",
      "Vocabulary",
      "Sequence",
      "예시",
      "Vocabulary",
      "Sequence",
      "예시",
      "Vocabulary",
      "Sequence",
    ]);
  });
});
