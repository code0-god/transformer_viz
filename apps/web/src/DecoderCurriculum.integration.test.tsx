// allow: SIZE_OK — curriculum end-to-end integration matrix
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactElement, StrictMode } from "react";
import { describe, expect, test, vi } from "vitest";
import { App } from "./App";
import { initialArchitectureState } from "./architecture/state";
import { model, TestWorker } from "./test/workerFixtures";
import {
  type CurriculumDiagramRendererProps,
  type CurriculumRendererRegistry,
  DecoderTrackWorkspace,
} from "./tracks/decoder-only-fundamentals/curriculum/DecoderTrackWorkspace";
import { decoderOnlyFundamentalsProfile } from "./tracks/decoder-only-fundamentals/profile";

const fixturePage = {
  id: "decoder.curriculum.guide.0.1",
  routeId: "decoder.root",
  title: "Generic fixture Guide",
  learningGoal: "Generic renderer contract",
  introduction: [
    { id: "fixture-intro", kind: "paragraph", text: "Fixture introduction" },
  ],
  sections: [
    {
      id: "decoder.curriculum.guide.0.1.section",
      title: "Fixture section",
      primaryNodeId: "decoder.root.input-context",
      blocks: [{ id: "fixture-body", kind: "paragraph", text: "Fixture body" }],
    },
  ],
  keyTakeaway: [],
  glossary: [],
} as const;

function FixtureDiagram({
  focusButtonRef,
  onFocusGuide,
}: CurriculumDiagramRendererProps): ReactElement {
  return (
    <figure>
      <svg role="img" aria-label="Generic fixture Diagram" viewBox="0 0 10 10">
        <title>Generic fixture Diagram</title>
      </svg>
      <figcaption>
        <fieldset aria-label="Generic fixture fallback" />
      </figcaption>
      <button ref={focusButtonRef} type="button" onClick={onFocusGuide}>
        Focus fixture Guide
      </button>
    </figure>
  );
}

const PART0_PRODUCTION_CHAPTERS = [
  ["자연어 처리란?", "decoder.curriculum.guide.0.1", "자연어 처리 추론 경로"],
  ["Token이란?", "decoder.curriculum.guide.0.2", "Token 경계 비교"],
  [
    "Vocabulary와 Token ID",
    "decoder.curriculum.guide.0.3",
    "Vocabulary 주소와 순서",
  ],
  [
    "Tokenization 방식",
    "decoder.curriculum.guide.0.4",
    "Tokenization 방식의 정성 비교",
  ],
] as const;

const PART1_PRODUCTION_CHAPTERS = [
  [
    "언어 모델이란?",
    "decoder.curriculum.guide.1.1",
    "언어 모델의 위치별 다음-token 점수",
  ],
  ["다음 Token 예측", "decoder.curriculum.guide.1.2", "다음 Token 선택 단계"],
  [
    "조건부 확률",
    "decoder.curriculum.guide.1.3",
    "Prefix 조건부 확률과 chain rule",
  ],
  [
    "Autoregressive Generation",
    "decoder.curriculum.guide.1.4",
    "Autoregressive predict append repeat loop",
  ],
] as const;

const PART2_PRODUCTION_CHAPTERS = [
  [
    "Token Embedding",
    "decoder.curriculum.guide.2.1",
    "Token ID와 embedding table row lookup",
  ],
  [
    "Position Embedding",
    "decoder.curriculum.guide.2.2",
    "Token과 learned absolute position embedding의 합",
  ],
  [
    "Hidden State",
    "decoder.curriculum.guide.2.3",
    "Causal prefix를 반영하는 hidden state 흐름",
  ],
] as const;

const fixtureRegistry: CurriculumRendererRegistry = {
  resolveGuidePage: () => fixturePage,
  resolveDiagram: () => FixtureDiagram,
  glossary: [],
  formulas: {},
  runtimeFacts: {},
};

function renderGenericCurriculum(
  rendererRegistry: CurriculumRendererRegistry = fixtureRegistry,
) {
  const navigate = vi.fn();
  render(
    <DecoderTrackWorkspace
      context={{
        model,
        state: initialArchitectureState,
        replaySequenceLength: null,
        navigate,
        course: {
          trackId: "decoder-only-fundamentals",
          chapterId: "decoder.chapter.0.1",
          homeHref: "#/",
          chapterHref: (chapterId) => `#/test/${chapterId}`,
          navigateChapter: vi.fn(),
        },
      }}
      profile={decoderOnlyFundamentalsProfile}
      rendererRegistry={rendererRegistry}
    />,
  );
  return navigate;
}

async function activateCurrentGenericChapter(
  _user: ReturnType<typeof userEvent.setup>,
  rendererRegistry: CurriculumRendererRegistry = fixtureRegistry,
): Promise<void> {
  renderGenericCurriculum(rendererRegistry);
}

function readyCurriculum() {
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

describe("Decoder curriculum production integration", () => {
  test("updates the Chapter URL without Worker traffic and focuses the heading", async () => {
    // Given: the real app is ready at the first Chapter.
    const worker = readyCurriculum();
    const user = userEvent.setup();
    const postsBefore = worker.posted.length;

    // When: the learner opens ToC and chooses Chapter 0.2.
    await user.click(screen.getByRole("button", { name: "목차 열기" }));
    const toc = screen.getByRole("navigation", { name: "Chapter 목차" });
    await user.click(within(toc).getByRole("link", { name: /Token이란\?/ }));

    // Then: Chapter state changes in place and focus follows once.
    expect(
      screen.getByRole("heading", { name: "Token이란?", level: 1 }),
    ).toHaveFocus();
    expect(screen.getByText("현재 Chapter 2 / 14")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/learn/decoder-only-fundamentals/0-2");
    expect(worker.posted).toHaveLength(postsBefore);
  });

  test("hands focus across a route only after the matching route registers", async () => {
    // Given: the destination button is available in the open ToC and events are observed before action.
    const worker = readyCurriculum();
    const user = userEvent.setup();
    const postsBefore = worker.posted.length;
    const trace: string[] = [];
    const record = (event: Event) =>
      trace.push((event as CustomEvent<string>).detail);
    window.addEventListener("curriculum-focus", record);
    await user.click(screen.getByRole("button", { name: "목차 열기" }));

    try {
      // When: the learner chooses the existing Transformer Block destination.
      await user.click(
        within(
          screen.getByRole("navigation", { name: "Chapter 목차" }),
        ).getByRole("link", { name: /Transformer Block/ }),
      );

      // Then: subscription precedes transition and matching registration focuses once.
      expect(trace).toEqual([
        "subscribe",
        "transition",
        "matching register",
        "reveal",
        "focus",
      ]);
      expect(screen.getByTestId("architecture-detail")).toBeInTheDocument();
      expect(
        document.querySelector("[data-guide-section-id='block-overview']"),
      ).toHaveFocus();
      expect(screen.queryByText("Focus target unavailable.")).toBeNull();
      expect(window.location.hash).toBe(
        "#/learn/decoder-only-fundamentals/4-1",
      );
      expect(worker.posted).toHaveLength(postsBefore);
    } finally {
      window.removeEventListener("curriculum-focus", record);
    }
  });

  test("renders the Chapter route curriculum immediately with one visible H1", () => {
    // Given/When: the real app boots on the curriculum Chapter route.
    readyCurriculum();

    // Then: the Chapter title is present once and the guide title does not duplicate it.
    expect(
      screen.queryByRole("heading", { name: "자연어 처리란?", level: 1 }),
    ).not.toBeNull();
    expect(
      screen.queryAllByRole("heading", { name: "자연어 처리란?", level: 1 }),
    ).toHaveLength(1);
    expect(
      screen.queryByRole("heading", { name: "자연어 처리란?", level: 3 }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", {
        name: "언어로 해결할 수 있는 문제",
        level: 2,
      }),
    ).not.toBeNull();
  });

  test("marks the current ToC link without requiring a second activation step", async () => {
    // Given: the curriculum navigation is opened from the header.
    const user = userEvent.setup();
    readyCurriculum();

    // When: the learner opens the Chapter list.
    await user.click(screen.getByRole("button", { name: "목차 열기" }));
    const toc = screen.getByRole("navigation", { name: "Chapter 목차" });

    // Then: the current Chapter remains a link and is already active.
    const current = within(toc).getByRole("link", {
      name: "자연어 처리란?",
    });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(
      screen.getAllByRole("heading", {
        name: "자연어 처리란?",
        level: 1,
      }),
    ).toHaveLength(1);
  });

  test("keeps the chapter title hierarchy at one H1 and one subordinate guide title", () => {
    // Given/When: the curriculum boots.
    readyCurriculum();

    // Then: the chapter title appears once and the guide content stays below it.
    expect(
      screen.queryByRole("heading", { name: "자연어 처리란?", level: 1 }),
    ).not.toBeNull();
    expect(
      screen.queryAllByRole("heading", { name: "자연어 처리란?", level: 1 }),
    ).toHaveLength(1);
    expect(
      screen.queryByRole("heading", { name: "자연어 처리란?", level: 3 }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", {
        name: "언어로 해결할 수 있는 문제",
        level: 2,
      }),
    ).not.toBeNull();
  });

  test("moves focus from the Diagram button to the Guide introduction", async () => {
    // Given: explicitly activated generic curriculum content.
    const user = userEvent.setup();
    await activateCurrentGenericChapter(user);

    // When: the native Diagram focus button is activated.
    await user.click(
      screen.getByRole("button", { name: "Focus fixture Guide" }),
    );

    // Then: focus enters the Guide introduction.
    expect(screen.getByTestId("guide-introduction")).toHaveFocus();
  });

  test("returns focus from the Guide section to the native Diagram button", async () => {
    // Given: explicitly activated generic curriculum content.
    const user = userEvent.setup();
    await activateCurrentGenericChapter(user);

    // When: the Guide asks to reveal its primary Diagram concept.
    await user.click(screen.getByRole("button", { name: "Fixture section" }));

    // Then: focus returns to the native Diagram control.
    expect(
      screen.getByRole("button", { name: "Focus fixture Guide" }),
    ).toHaveFocus();
  });

  test.each([
    ["page", { ...fixtureRegistry, resolveGuidePage: () => undefined }],
    ["Diagram", { ...fixtureRegistry, resolveDiagram: () => undefined }],
  ] as const)(
    "falls back without flash when the %s resolver misses",
    async (_missing, registry) => {
      // Given: one side of the renderer pair is unavailable and selection is explicit.
      const user = userEvent.setup();
      await activateCurrentGenericChapter(user, registry);

      // When/Then: activation resolves atomically to the incumbent architecture.
      expect(screen.getByTestId("architecture-root")).toBeInTheDocument();
      expect(
        screen.queryByRole("img", { name: "Generic fixture Diagram" }),
      ).toBeNull();
      expect(screen.queryByText("Fixture introduction")).toBeNull();
      expect(
        screen.getByRole("heading", { name: "자연어 처리란?", level: 1 }),
      ).toHaveFocus();
      expect(screen.queryByText("Focus target unavailable.")).toBeNull();
    },
  );

  test("renders the production Chapter route curriculum immediately with a single visible H1", () => {
    // Given/When: the real curriculum app boots.
    readyCurriculum();

    // Then: the chapter title is already rendered once, and the guide does not duplicate it.
    expect(
      screen.queryByRole("heading", { name: "자연어 처리란?", level: 1 }),
    ).not.toBeNull();
    expect(
      screen.queryAllByRole("heading", { name: "자연어 처리란?", level: 1 }),
    ).toHaveLength(1);
    expect(
      screen.queryByRole("heading", { name: "자연어 처리란?", level: 3 }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", {
        name: "언어로 해결할 수 있는 문제",
        level: 2,
      }),
    ).not.toBeNull();
  });

  test.each(PART0_PRODUCTION_CHAPTERS)(
    "traverses production %s with exact page and Diagram identity",
    async (chapterTitle, pageId, imageName) => {
      // Given: fresh inactive production state and unchanged side-effect counters.
      const worker = readyCurriculum();
      const user = userEvent.setup();
      const postsBefore = worker.posted.length;
      await user.click(screen.getByRole("button", { name: "목차 열기" }));

      // When: the requested Part 0 Chapter is explicitly selected.
      await user.click(
        within(
          screen.getByRole("navigation", { name: "Chapter 목차" }),
        ).getByRole("link", {
          name: new RegExp(chapterTitle.replace("?", "\\?")),
        }),
      );

      // Then: page, Diagram, focus, progress, and side effects are exact.
      expect(
        document.querySelector(`[data-guide-page-id='${pageId}']`),
      ).not.toBeNull();
      expect(screen.getByRole("img", { name: imageName })).toBeInTheDocument();
      const ordinal = PART0_PRODUCTION_CHAPTERS.findIndex(
        ([title]) => title === chapterTitle,
      );
      const heading = screen.getByRole("heading", {
        name: chapterTitle,
        level: 1,
      });
      if (ordinal === 0) expect(heading).toBeInTheDocument();
      else expect(heading).toHaveFocus();
      expect(
        screen.getByText(`현재 Chapter ${ordinal + 1} / 14`),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Visualization/)).toBeNull();
      expect(screen.queryByRole("slider")).toBeNull();
      expect(screen.queryByRole("switch")).toBeNull();
      expect(window.location.hash).toBe(
        `#/learn/decoder-only-fundamentals/${pageId
          .replace("decoder.curriculum.guide.", "")
          .replaceAll(".", "-")}`,
      );
      expect(worker.posted).toHaveLength(postsBefore);

      // And: reopening the ToC preserves exactly one matching current item.
      await user.click(screen.getByRole("button", { name: "목차 열기" }));
      const toc = screen.getByRole("navigation", { name: "Chapter 목차" });
      expect(
        within(toc).getAllByRole("link", { current: "page" }),
      ).toHaveLength(1);
      expect(
        within(toc).getByRole("link", {
          name: new RegExp(chapterTitle.replace("?", "\\?")),
        }),
      ).toHaveAttribute("aria-current", "page");
    },
  );

  test.each(PART1_PRODUCTION_CHAPTERS)(
    "routes production %s without Worker mutation",
    async (chapterTitle, pageId, imageName) => {
      // Given: a fresh inactive app with side-effect counters.
      const worker = readyCurriculum();
      const user = userEvent.setup();
      const postsBefore = worker.posted.length;
      await user.click(screen.getByRole("button", { name: "목차 열기" }));

      // When: the Part 1 Chapter is explicitly selected.
      await user.click(
        within(
          screen.getByRole("navigation", { name: "Chapter 목차" }),
        ).getByRole("link", { name: chapterTitle }),
      );

      // Then: the exact content pair replaces legacy atomically.
      expect(
        document.querySelector(`[data-guide-page-id='${pageId}']`),
      ).not.toBeNull();
      expect(screen.getByRole("img", { name: imageName })).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: chapterTitle, level: 1 }),
      ).toHaveFocus();
      expect(screen.queryByTestId("architecture-root")).toBeNull();
      expect(screen.queryByText(/Visualization/)).toBeNull();
      expect(screen.queryByRole("slider")).toBeNull();
      expect(screen.queryByRole("switch")).toBeNull();
      expect(window.location.hash).toBe(
        `#/learn/decoder-only-fundamentals/${pageId
          .replace("decoder.curriculum.guide.", "")
          .replaceAll(".", "-")}`,
      );
      expect(worker.posted).toHaveLength(postsBefore);
    },
  );

  test.each(PART2_PRODUCTION_CHAPTERS)(
    "activates production %s with typed runtime facts and no side effects",
    async (chapterTitle, pageId, imageName) => {
      // Given: a fresh inactive app with URL, history, and Worker counters.
      const worker = readyCurriculum();
      const user = userEvent.setup();
      const postsBefore = worker.posted.length;
      await user.click(screen.getByRole("button", { name: "목차 열기" }));

      // When: the Part 2 Chapter is explicitly selected.
      await user.click(
        within(
          screen.getByRole("navigation", { name: "Chapter 목차" }),
        ).getByRole("link", { name: chapterTitle }),
      );

      // Then: the exact content pair and current facts replace legacy atomically.
      expect(
        document.querySelector(`[data-guide-page-id='${pageId}']`),
      ).not.toBeNull();
      expect(screen.getByRole("img", { name: imageName })).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: chapterTitle, level: 1 }),
      ).toHaveFocus();
      expect(
        document.querySelectorAll("[data-runtime-presentation-id]").length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.queryByTestId("architecture-root")).toBeNull();
      expect(screen.queryByText(/Visualization/)).toBeNull();
      expect(screen.queryByRole("slider")).toBeNull();
      expect(screen.queryByRole("switch")).toBeNull();
      expect(window.location.hash).toBe(
        `#/learn/decoder-only-fundamentals/${pageId
          .replace("decoder.curriculum.guide.", "")
          .replaceAll(".", "-")}`,
      );
      expect(worker.posted).toHaveLength(postsBefore);
    },
  );

  test("keeps one conceptual image and separate native controls", () => {
    // Given/When: the root curriculum surface is rendered.
    readyCurriculum();

    // Then: the diagram remains one named image while controls stay buttons.
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "목차 열기" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
