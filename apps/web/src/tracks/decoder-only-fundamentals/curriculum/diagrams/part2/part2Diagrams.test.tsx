import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { describe, expect, test } from "vitest";

import { App } from "../../../../../App";
import { model, TestWorker } from "../../../../../test/workerFixtures";

const CHAPTERS = [
  ["Token Embedding", "Token ID와 embedding table row lookup"],
  ["Position Embedding", "Token과 learned absolute position embedding의 합"],
  ["Hidden State", "Causal prefix를 반영하는 hidden state 흐름"],
] as const;

function readyCurriculum(): TestWorker {
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

describe("Part 2 curriculum Diagrams", () => {
  test.each(CHAPTERS)(
    "renders %s as one named symbolic SVG with fallback and focus control",
    async (chapterTitle, imageName) => {
      // Given: a ready app and the real curriculum ToC.
      const worker = readyCurriculum();
      const user = userEvent.setup();
      const postsBefore = worker.posted.length;
      await user.click(screen.getByRole("button", { name: "목차 열기" }));

      // When: a Part 2 Chapter is explicitly selected.
      await user.click(
        within(
          screen.getByRole("navigation", { name: "Chapter 목차" }),
        ).getByRole("button", { name: chapterTitle }),
      );

      // Then: one symbolic image, equivalent fallback, and native focus remain Worker-inert.
      const pane = document.querySelector("#learning-diagram-pane");
      expect(pane).toBeInstanceOf(HTMLElement);
      expect(pane?.querySelectorAll("svg[role='img']")).toHaveLength(1);
      expect(
        pane?.querySelector(`svg[aria-label='${imageName}']`),
      ).not.toBeNull();
      expect(
        pane?.querySelector(`fieldset[aria-label='${chapterTitle} 의미 설명']`),
      ).not.toBeNull();
      const focus = pane?.querySelector("button.part2-diagram__focus");
      expect(focus).toBeInstanceOf(HTMLButtonElement);
      if (!(focus instanceof HTMLButtonElement)) return;
      await user.click(focus);
      expect(screen.getByTestId("guide-introduction")).toHaveFocus();
      expect(
        pane?.querySelector(
          "[role='slider'],[role='switch'],[role='grid'],[role='heatmap'],select,input",
        ),
      ).toBeNull();
      expect(pane?.textContent).not.toMatch(
        /Visualization|inspector|selected layer|Part 4|Worker/i,
      );
      expect(worker.posted).toHaveLength(postsBefore);
    },
  );
});
