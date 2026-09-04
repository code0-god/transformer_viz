import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { describe, expect, test } from "vitest";

import { App } from "../../../../../App";
import { model, TestWorker } from "../../../../../test/workerFixtures";
import { NlpPipelineDiagram } from "./NlpPipelineDiagram";
import { VocabularyAddressDiagram } from "./VocabularyAddressDiagram";

const CHAPTERS = [
  ["자연어 처리란?", "자연어 처리 연속 설명"],
  ["Token이란?", "Token 분절 연속 설명"],
  [
    "Vocabulary와 Token ID",
    "Token과 Token ID를 embedding row에 연결하는 vocabulary lookup",
  ],
  ["Tokenization 방식", "Tokenization 방식 비교"],
] as const;

const INLINE_CHAPTERS = [
  [
    "자연어 처리란?",
    "decoder.diagram.intro.nlp",
    "자연어 처리 연속 설명",
    "문장이 숫자 표현으로 바뀌고 계산을 거쳐 사람이 활용하는 결과로 이어집니다.",
  ],
  [
    "Token이란?",
    "decoder.diagram.tokenization.token",
    "Token 분절 연속 설명",
    "문장이 순서 있는 Token 단위로 나뉘고 현재 모델의 byte 단위로 이어집니다.",
  ],
  [
    "Vocabulary와 Token ID",
    "decoder.diagram.tokenization.vocabulary",
    "Token과 Token ID를 embedding row에 연결하는 vocabulary lookup",
    "Token ID는 의미값이 아니라 vocabulary와 embedding row를 찾는 주소입니다.",
  ],
  [
    "Tokenization 방식",
    "decoder.diagram.tokenization.methods",
    "Tokenization 방식 비교",
    "Tokenization 방식은 vocabulary 크기와 sequence 길이에 영향을 줍니다.",
  ],
] as const;

const NLP_GOLDEN_STAGES = [
  "language",
  "numeric",
  "transform",
  "result",
  "token-preview",
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
  test("renders one persistent sentence and horizontal number sequence", () => {
    const { container } = render(<NlpPipelineDiagram />);
    expect(screen.getByTestId("nlp-golden-visual")).toHaveAttribute(
      "data-nlp-stage",
      "language",
    );
    expect(screen.getByTestId("nlp-golden-sentence")).toBeVisible();
    expect(screen.getByTestId("nlp-golden-numeric-strip")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-nlp-value]")).toHaveLength(6);
    expect(container.querySelectorAll("[data-nlp-cell]")).toHaveLength(0);
    expect(container.querySelector("rect")).toBeNull();
  });

  test("exposes all five states through semantic fallback", () => {
    render(<NlpPipelineDiagram />);
    expect(
      screen
        .getAllByRole("listitem")
        .map((item) => item.getAttribute("data-nlp-fallback-stage")),
    ).toEqual(NLP_GOLDEN_STAGES);
  });

  test("renders Vocabulary as lookup relationships without a board", () => {
    const { container } = render(<VocabularyAddressDiagram />);

    expect(container.querySelectorAll("[data-vocabulary-lookup]")).toHaveLength(
      2,
    );
    expect(container.querySelector(".part0-diagram__address-board")).toBeNull();
    expect(
      container.querySelector(".part0-diagram__reserved-legend"),
    ).toBeNull();
    expect(container.querySelectorAll("rect")).toHaveLength(0);
  });

  test("orders chapter context before the title and keeps precise corners", () => {
    readyCurriculum();

    const header = document.querySelector(
      ".curriculum-workspace__chapter-copy",
    );
    const eyebrow = header?.querySelector(".curriculum-workspace__eyebrow");
    const title = header?.querySelector("h1");
    if (
      !(eyebrow instanceof HTMLElement) ||
      !(title instanceof HTMLHeadingElement)
    )
      throw new Error("Curriculum heading hierarchy is missing");

    expect(
      eyebrow.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const methodRows = document.querySelectorAll(
      ".part0-diagram__method-row > rect",
    );
    for (const row of methodRows) {
      expect(Number(row.getAttribute("rx"))).toBeLessThanOrEqual(8);
    }
  });

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
      if (chapterTitle === "자연어 처리란?") {
        expect(
          pane.querySelector("[data-testid='nlp-golden-visual']"),
        ).not.toBeNull();
      } else if (chapterTitle === "Token이란?") {
        expect(pane.querySelector("[data-token-golden-visual]")).not.toBeNull();
      } else {
        expect(
          pane.querySelector(`svg[aria-label='${imageName}']`),
        ).not.toBeNull();
      }
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

  test("renders Chapter 0.1 as one five-step guided deck", async () => {
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
      name: "자연어 처리 연속 설명",
    });
    const pane = image.closest("figure");
    expect(pane).not.toBeNull();
    if (!(pane instanceof HTMLElement))
      throw new Error("Missing inline Figure");
    const stageLabels = Array.from(
      pane.querySelectorAll("[data-nlp-fallback-stage]"),
    ).map((stage) => stage.getAttribute("data-nlp-fallback-stage") ?? "");
    expect(stageLabels).toEqual(NLP_GOLDEN_STAGES);
    expect(
      document.querySelector("[data-narrative-mode='deck']"),
    ).not.toBeNull();
    expect(within(pane).getAllByRole("img")).toHaveLength(1);
    expect(
      within(pane).queryByRole("img", { name: "자연어 처리 추론 경로" }),
    ).not.toBeInTheDocument();
    expect(
      within(pane).getByRole("img", { name: "자연어 처리 연속 설명" }),
    ).toBeInTheDocument();
    const fallback = within(pane).getByRole("group", {
      name: "자연어 처리란? 의미 설명",
    });
    expect(fallback).toBeInTheDocument();
    expect(
      within(fallback)
        .getAllByRole("listitem")
        .map((item) => item.getAttribute("data-nlp-fallback-stage")),
    ).toEqual(NLP_GOLDEN_STAGES);
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
