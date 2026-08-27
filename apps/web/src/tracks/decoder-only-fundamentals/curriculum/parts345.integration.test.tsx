import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { describe, expect, test } from "vitest";

import { App } from "../../../App";
import { model, TestWorker } from "../../../test/workerFixtures";
import { createCurriculumFocusHandoff } from "./curriculumState";

const ARCHITECTURE_CHAPTERS = [
  {
    chapterId: "decoder.chapter.3.1",
    title: "GPT",
    routeId: "decoder.root",
    pageId: "decoder-guide-root",
    sectionId: "root-generation-overview",
    progress: 12,
  },
  {
    chapterId: "decoder.chapter.4.1",
    title: "Transformer Block",
    routeId: "decoder.block",
    pageId: "decoder-guide-block",
    sectionId: "block-overview",
    progress: 13,
  },
  {
    chapterId: "decoder.chapter.5.1",
    title: "Self-Attention",
    routeId: "decoder.self-attention",
    pageId: "decoder-guide-self-attention",
    sectionId: "qkv",
    progress: 14,
  },
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

async function selectChapter(title: string): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "목차 열기" }));
  await user.click(
    within(screen.getByRole("navigation", { name: "Chapter 목차" })).getByRole(
      "link",
      { name: title },
    ),
  );
}

// allow: SIZE_OK — fixed Parts 3–5 route and focus integration matrix

describe("Parts 3 through 5 incumbent route integration", () => {
  test.each(ARCHITECTURE_CHAPTERS)(
    "reuses the incumbent $title route and Guide identity",
    async ({ title, routeId, pageId, sectionId, progress }) => {
      // Given: a fresh legacy architecture surface and stable Worker traffic.
      const worker = readyCurriculum();
      const postsBefore = worker.posted.length;

      // When: the architecture Chapter is selected from the curriculum ToC.
      await selectChapter(title);

      // Then: the incumbent route/page mounts and its registered destination owns focus.
      expect(
        document.querySelector(`[data-learning-route-id='${routeId}']`),
      ).not.toBeNull();
      expect(
        document.querySelector(`[data-guide-page-id='${pageId}']`),
      ).not.toBeNull();
      expect(
        document.querySelector(`[data-guide-section-id='${sectionId}']`),
      ).toHaveFocus();
      expect(
        screen.getByText(`현재 Chapter ${progress} / 14`),
      ).toBeInTheDocument();
      expect(worker.posted).toHaveLength(postsBefore);
    },
  );

  test("preserves one named Attention math unit and owns its narrow sizing", async () => {
    readyCurriculum();
    await selectChapter("Self-Attention");
    const page = document.querySelector(
      '[data-guide-page-id="decoder-guide-self-attention"]',
    );
    const summary = page?.querySelector(
      '[role="math"][aria-label="Self-Attention summary"]',
    );
    const css = readFileSync(
      resolve(
        process.cwd(),
        "src/tracks/decoder-only-fundamentals/curriculum/curriculum.css",
      ),
      "utf8",
    );

    expect(summary).not.toBeNull();
    expect(
      page?.querySelectorAll(
        '[role="math"][aria-label="Self-Attention summary"]',
      ),
    ).toHaveLength(1);
    expect(css).toMatch(
      /data-guide-page-id=["']decoder-guide-self-attention["'][\s\S]*learning-guide-math-scroll[\s\S]*\.katex[\s\S]*font-size:\s*1\.17em/,
    );
  });

  test("moves 2.3 next to 3.1 without skipping Part 3", async () => {
    // Given: Chapter 2.3 is active and focus events are subscribed before navigation.
    readyCurriculum();
    const user = userEvent.setup();
    await selectChapter("Hidden State");
    const trace: string[] = [];
    const record = (event: Event): void => {
      trace.push((event as CustomEvent<string>).detail);
    };
    window.addEventListener("curriculum-focus", record);

    try {
      // When: the exact adjacent next control is activated.
      await user.click(screen.getByRole("link", { name: "다음: GPT" }));

      // Then: the root Guide registers before reveal/focus and Part 4 is not skipped to.
      expect(trace).toEqual([
        "subscribe",
        "transition",
        "matching register",
        "reveal",
        "focus",
      ]);
      expect(
        document.querySelector(
          "[data-curriculum-chapter-id='decoder.chapter.3.1']",
        ),
      ).not.toBeNull();
      expect(
        document.querySelector("[data-guide-page-id='decoder-guide-root']"),
      ).not.toBeNull();
      expect(
        document.querySelector(
          "[data-guide-section-id='root-generation-overview']",
        ),
      ).toHaveFocus();
      expect(screen.getByText("현재 Chapter 12 / 14")).toBeInTheDocument();
    } finally {
      window.removeEventListener("curriculum-focus", record);
    }
  });

  test("traverses 3.1 through 5.1 and back without a stale focus or final next control", async () => {
    // Given: Chapter 3.1 is active on the incumbent Root Guide.
    readyCurriculum();
    const user = userEvent.setup();
    await selectChapter("GPT");

    // When/Then: adjacent controls follow the exact bidirectional spine.
    await user.click(
      screen.getByRole("link", { name: "다음: Transformer Block" }),
    );
    expect(
      document.querySelector(
        "[data-curriculum-chapter-id='decoder.chapter.4.1']",
      ),
    ).not.toBeNull();
    await user.click(
      screen.getByRole("link", { name: "다음: Self-Attention" }),
    );
    expect(
      document.querySelector(
        "[data-curriculum-chapter-id='decoder.chapter.5.1']",
      ),
    ).not.toBeNull();
    expect(screen.queryByRole("link", { name: /^다음:/ })).toBeNull();
    await user.click(
      screen.getByRole("link", { name: "이전: Transformer Block" }),
    );
    await user.click(screen.getByRole("link", { name: "이전: GPT" }));
    await user.click(screen.getByRole("link", { name: "이전: Hidden State" }));
    expect(
      document.querySelector(
        "[data-curriculum-chapter-id='decoder.chapter.2.3']",
      ),
    ).not.toBeNull();
    expect(screen.queryByText("Focus target unavailable.")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Hidden State", level: 1 }),
    ).toHaveFocus();
  });

  test("focuses generated-token bidirectionally between the Root Diagram and Guide", async () => {
    // Given: the incumbent Root workspace and its exact generated-token node.
    const worker = readyCurriculum();
    const user = userEvent.setup();
    const postsBefore = worker.posted.length;
    await selectChapter("GPT");
    const generatedToken = screen.getByRole("button", {
      name: /생성된 token.*선택 가능/,
    });

    // When: Diagram focus moves to the Guide and then returns from its section control.
    await user.click(generatedToken);
    const guideSection = screen.getByRole("region", {
      name: "붙이고 다시 계산하기",
    });
    expect(guideSection).toHaveFocus();
    await user.click(
      within(guideSection).getByRole("button", {
        name: "붙이고 다시 계산하기",
      }),
    );

    // Then: the exact generated-token Diagram target owns focus with no Worker post.
    expect(generatedToken).toHaveFocus();
    expect(worker.posted).toHaveLength(postsBefore);
  });

  test("does not consume a pending focus for the wrong route registration", async () => {
    // Given: a subscribed handoff and a bounded completion signal.
    const events: string[] = [];
    let resolveFocus = (): void => undefined;
    const completion = new Promise<void>((resolve) => {
      resolveFocus = resolve;
    });
    const handoff = createCurriculumFocusHandoff((event) => {
      events.push(event);
      if (event === "focus") resolveFocus();
    });
    const destination = {
      routeId: "decoder.block",
      sectionId: "block-overview",
      nodeId: "decoder.root.transformer-block",
    } as const;
    handoff.navigate(destination, () => undefined);

    // When: only a different route registers before the bounded deadline.
    handoff.register({
      ...destination,
      routeId: "decoder.root",
      element: document.createElement("section"),
    });
    const bounded = Promise.race([
      completion,
      new Promise<void>((_resolve, reject) => {
        window.setTimeout(
          () => reject(new Error("curriculum-focus-timeout: decoder.block")),
          25,
        );
      }),
    ]);

    // Then: the mismatch cannot consume the original pending destination.
    await expect(bounded).rejects.toThrow(
      "curriculum-focus-timeout: decoder.block",
    );
    expect(handoff.pending()).toEqual(destination);
    expect(events).toEqual(["subscribe", "transition"]);
  });

  test("replaces stale pending focus when back navigation starts", () => {
    // Given: forward navigation is pending when a back transition begins.
    const handoff = createCurriculumFocusHandoff(() => undefined);
    const forward = {
      routeId: "decoder.self-attention",
      sectionId: "qkv",
      nodeId: "decoder.attention.qkv-projection",
    } as const;
    const back = {
      routeId: "decoder.block",
      sectionId: "block-overview",
      nodeId: "decoder.root.transformer-block",
    } as const;
    handoff.navigate(forward, () => undefined);

    // When: back navigation subscribes before the stale destination registers.
    handoff.navigate(back, () => undefined);
    handoff.register({
      ...forward,
      element: document.createElement("section"),
    });

    // Then: stale forward registration is ignored and the back target remains pending.
    expect(handoff.pending()).toEqual(back);
  });

  test("preserves architecture-owned layer and head state across curriculum transitions", async () => {
    // Given: incumbent Attention state has non-default layer and head selections.
    readyCurriculum();
    const user = userEvent.setup();
    await selectChapter("Self-Attention");
    await user.click(screen.getByRole("button", { name: "Layer 2" }));
    await user.click(screen.getByRole("button", { name: "Head 3" }));
    expect(screen.getByTestId("attention-detail")).toHaveAttribute(
      "data-selected-layer",
      "2",
    );
    expect(screen.getByTestId("attention-detail")).toHaveAttribute(
      "data-selected-head",
      "3",
    );

    // When: curriculum navigation leaves Attention and later returns.
    await user.click(
      screen.getByRole("link", { name: "이전: Transformer Block" }),
    );
    await user.click(
      screen.getByRole("link", { name: "다음: Self-Attention" }),
    );

    // Then: route transition changes only view; architecture selections remain owned upstream.
    expect(screen.getByTestId("attention-detail")).toHaveAttribute(
      "data-selected-layer",
      "2",
    );
    expect(screen.getByTestId("attention-detail")).toHaveAttribute(
      "data-selected-head",
      "3",
    );
  });
});
