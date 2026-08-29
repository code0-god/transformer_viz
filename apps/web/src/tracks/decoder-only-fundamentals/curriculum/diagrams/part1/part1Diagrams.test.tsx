import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { describe, expect, test } from "vitest";

import { App } from "../../../../../App";
import { model, TestWorker } from "../../../../../test/workerFixtures";

const CHAPTERS = [
  ["언어 모델이란?", "Context에서 다음 token 후보로 이어지는 언어 모델의 역할"],
  ["다음 Token 예측", "Vocabulary logit에서 다음 token 선택까지의 한 단계"],
  ["조건부 확률", "세 token sequence의 조건부 확률 연쇄"],
  ["Autoregressive Generation", "생성한 token을 context에 추가하는 반복 과정"],
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

describe("Part 1 curriculum Diagrams", () => {
  test.each(CHAPTERS)(
    "renders %s as one named SVG with equivalent fallback",
    async (chapterTitle, imageName) => {
      // Given: a ready app and the real curriculum ToC.
      const worker = readyCurriculum();
      const user = userEvent.setup();
      const postsBefore = worker.posted.length;
      await user.click(screen.getByRole("button", { name: "목차 열기" }));

      // When: a Part 1 Chapter is explicitly selected.
      await user.click(
        within(
          screen.getByRole("navigation", { name: "Chapter 목차" }),
        ).getByRole("link", { name: chapterTitle }),
      );
      // Then: the inline Figure is semantic, non-interactive, and Worker-inert.
      const image = screen.getByRole("img", { name: imageName });
      const pane = image.closest("figure");
      expect(pane).toBeInstanceOf(HTMLElement);
      expect(pane?.querySelectorAll("svg[role='img']")).toHaveLength(1);
      expect(
        pane?.querySelector(`svg[aria-label='${imageName}']`),
      ).not.toBeNull();
      expect(
        pane?.querySelector(`fieldset[aria-label='${chapterTitle} 의미 설명']`),
      ).not.toBeNull();
      expect(image).toHaveAttribute("data-figure-layout", "desktop");
      expect(image).toHaveAttribute("data-figure-question");
      const focus = pane?.querySelector("button.part1-diagram__focus");
      expect(focus).toBeNull();
      expect(
        pane?.querySelector("[role='slider'],[role='switch'],select,input"),
      ).toBeNull();
      expect(screen.queryByTestId("open-diagram-viewer")).toBeNull();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(worker.posted).toHaveLength(postsBefore);
    },
  );

  test("keeps one semantic stage order for next-token prediction", async () => {
    readyCurriculum();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "목차 열기" }));
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Chapter 목차" }),
      ).getByRole("link", { name: "다음 Token 예측" }),
    );
    expect(
      screen.getByRole("img", {
        name: "Vocabulary logit에서 다음 token 선택까지의 한 단계",
      }),
    ).toHaveAttribute(
      "data-stage-order",
      "context vocabulary-logits selection-distribution sampler next-token",
    );
  });
});
