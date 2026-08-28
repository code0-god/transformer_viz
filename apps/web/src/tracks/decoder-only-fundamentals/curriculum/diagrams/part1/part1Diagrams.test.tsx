import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { describe, expect, test } from "vitest";

import { App } from "../../../../../App";
import { model, TestWorker } from "../../../../../test/workerFixtures";

const CHAPTERS = [
  ["언어 모델이란?", "언어 모델의 위치별 다음-token 점수"],
  ["다음 Token 예측", "다음 Token 선택 단계"],
  ["조건부 확률", "Prefix 조건부 확률과 chain rule"],
  ["Autoregressive Generation", "Autoregressive predict append repeat loop"],
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

  test("uses one top-to-bottom flow for next-token prediction", async () => {
    readyCurriculum();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "목차 열기" }));
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Chapter 목차" }),
      ).getByRole("link", { name: "다음 Token 예측" }),
    );
    const stages = Array.from(
      document.querySelectorAll(
        "[data-guide-page-id='decoder.curriculum.guide.1.2'] [data-stage] > rect",
      ),
    );
    const xCoordinates = stages.map((stage) => stage.getAttribute("x"));
    const yCoordinates = stages.map((stage) => Number(stage.getAttribute("y")));

    expect(new Set(xCoordinates).size).toBe(1);
    expect(yCoordinates).toEqual([...yCoordinates].sort((a, b) => a - b));
  });
});
