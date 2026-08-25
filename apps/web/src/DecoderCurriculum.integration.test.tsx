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
      }}
      profile={decoderOnlyFundamentalsProfile}
      rendererRegistry={rendererRegistry}
    />,
  );
  return navigate;
}

async function activateCurrentGenericChapter(
  user: ReturnType<typeof userEvent.setup>,
  rendererRegistry: CurriculumRendererRegistry = fixtureRegistry,
): Promise<void> {
  renderGenericCurriculum(rendererRegistry);
  await user.click(screen.getByRole("button", { name: "목차 열기" }));
  await user.click(
    within(screen.getByRole("navigation", { name: "Chapter 목차" })).getByRole(
      "button",
      { name: "자연어 처리란?" },
    ),
  );
}

function readyCurriculum() {
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
  test("navigates in place without URL or Worker traffic and focuses the Chapter heading", async () => {
    // Given: the real app is ready at the first Chapter.
    const worker = readyCurriculum();
    const user = userEvent.setup();
    const postsBefore = worker.posted.length;
    const locationBefore = window.location.href;

    // When: the learner opens ToC and chooses Chapter 0.2.
    await user.click(screen.getByRole("button", { name: "목차 열기" }));
    const toc = screen.getByRole("navigation", { name: "Chapter 목차" });
    await user.click(within(toc).getByRole("button", { name: /Token이란\?/ }));

    // Then: Chapter state changes in place and focus follows once.
    expect(
      screen.getByRole("heading", { name: "Token이란?", level: 1 }),
    ).toHaveFocus();
    expect(screen.getByText("현재 Chapter 2 / 14")).toBeInTheDocument();
    expect(window.location.href).toBe(locationBefore);
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
        ).getByRole("button", { name: /Transformer Block/ }),
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
        screen.getByRole("heading", { name: "Transformer Block", level: 1 }),
      ).toHaveFocus();
      expect(screen.queryByText("Focus target unavailable.")).toBeNull();
      expect(worker.posted).toHaveLength(postsBefore);
    } finally {
      window.removeEventListener("curriculum-focus", record);
    }
  });

  test("keeps a complete generic registry inactive on initial render", () => {
    // Given/When: a complete generic registry mounts at Chapter 0.1.
    renderGenericCurriculum();

    // Then: only the incumbent architecture is visible before explicit selection.
    expect(screen.getByTestId("architecture-root")).toBeInTheDocument();
    expect(
      document.querySelector("svg[aria-label='Generic fixture Diagram']"),
    ).toBeNull();
    expect(screen.queryByText("Fixture introduction")).toBeNull();
  });

  test("opening the ToC alone preserves the inactive legacy surface", async () => {
    // Given: the inactive generic curriculum, stable URL/history, and focused opener.
    const navigate = renderGenericCurriculum();
    const user = userEvent.setup();
    const opener = screen.getByRole("button", { name: "목차 열기" });
    const locationBefore = window.location.href;
    const historyBefore = window.history.length;
    opener.focus();

    // When: only the disclosure opener is activated.
    await user.click(opener);

    // Then: disclosure state changes without curriculum, focus, route, or progress mutation.
    expect(screen.getByTestId("architecture-root")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Generic fixture Diagram" }),
    ).toBeNull();
    expect(screen.queryByText("Fixture introduction")).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(window.location.href).toBe(locationBefore);
    expect(window.history.length).toBe(historyBefore);
    expect(navigate).not.toHaveBeenCalled();
    expect(
      within(
        screen.getByRole("navigation", { name: "Chapter 목차" }),
      ).getAllByRole("button", { current: "page" }),
    ).toHaveLength(1);
    expect(screen.getByText("현재 Chapter 1 / 14")).toBeInTheDocument();
  });

  test("activates the already-current Chapter 0.1 explicitly and focuses once", async () => {
    // Given: an inactive complete registry and observable Chapter heading focus.
    const user = userEvent.setup();
    renderGenericCurriculum();
    const heading = screen.getByRole("heading", {
      name: "자연어 처리란?",
      level: 1,
    });
    const focus = vi.spyOn(heading, "focus");
    const locationBefore = window.location.href;
    const historyBefore = window.history.length;

    // When: the learner explicitly selects the already-current ToC item.
    await user.click(screen.getByRole("button", { name: "목차 열기" }));
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Chapter 목차" }),
      ).getByRole("button", { name: "자연어 처리란?" }),
    );

    // Then: generic content replaces legacy atomically and focus moves once.
    expect(screen.queryByTestId("architecture-root")).toBeNull();
    expect(
      screen.getByRole("img", { name: "Generic fixture Diagram" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Fixture introduction")).toBeInTheDocument();
    expect(heading).toHaveFocus();
    expect(focus).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe(locationBefore);
    expect(window.history.length).toBe(historyBefore);
    expect(screen.getByText("현재 Chapter 1 / 14")).toBeInTheDocument();

    // And: reopening the disclosure still exposes exactly one current item.
    await user.click(screen.getByRole("button", { name: "목차 열기" }));
    expect(
      within(
        screen.getByRole("navigation", { name: "Chapter 목차" }),
      ).getAllByRole("button", { current: "page" }),
    ).toHaveLength(1);
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

  test("keeps the production registry inactive until current 0.1 is selected", async () => {
    // Given: the production app begins on the incumbent architecture.
    const worker = readyCurriculum();
    const user = userEvent.setup();
    const postsBefore = worker.posted.length;
    const hrefBefore = window.location.href;
    const historyBefore = window.history.length;
    const opener = screen.getByRole("button", { name: "목차 열기" });
    opener.focus();
    expect(screen.getByTestId("architecture-root")).toBeInTheDocument();
    expect(
      document.querySelector(
        "[data-guide-page-id='decoder.curriculum.guide.0.1']",
      ),
    ).toBeNull();

    // When: only the ToC disclosure is opened.
    await user.click(opener);

    // Then: the opener is inert with one current item and unchanged side effects.
    const toc = screen.getByRole("navigation", { name: "Chapter 목차" });
    expect(screen.getByTestId("architecture-root")).toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
    expect(within(toc).getAllByRole("button")).toHaveLength(14);
    expect(
      within(toc).getAllByRole("button", { current: "page" }),
    ).toHaveLength(1);
    expect(screen.getByText("현재 Chapter 1 / 14")).toBeInTheDocument();
    expect(window.location.href).toBe(hrefBefore);
    expect(window.history.length).toBe(historyBefore);
    expect(worker.posted).toHaveLength(postsBefore);

    // When: the already-current Chapter is explicitly selected.
    await user.click(
      within(toc).getByRole("button", { name: "자연어 처리란?" }),
    );

    // Then: production Part 0 replaces legacy and owns heading focus once.
    expect(screen.queryByTestId("architecture-root")).toBeNull();
    expect(
      document.querySelector(
        "[data-guide-page-id='decoder.curriculum.guide.0.1']",
      ),
    ).not.toBeNull();
    expect(
      screen.getByRole("img", { name: "자연어 처리 추론 경로" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "자연어 처리란?", level: 1 }),
    ).toHaveFocus();
    expect(window.location.href).toBe(hrefBefore);
    expect(window.history.length).toBe(historyBefore);
    expect(worker.posted).toHaveLength(postsBefore);
  });

  test.each(PART0_PRODUCTION_CHAPTERS)(
    "traverses production %s with exact page and Diagram identity",
    async (chapterTitle, pageId, imageName) => {
      // Given: fresh inactive production state and unchanged side-effect counters.
      const worker = readyCurriculum();
      const user = userEvent.setup();
      const postsBefore = worker.posted.length;
      const hrefBefore = window.location.href;
      const historyBefore = window.history.length;
      await user.click(screen.getByRole("button", { name: "목차 열기" }));

      // When: the requested Part 0 Chapter is explicitly selected.
      await user.click(
        within(
          screen.getByRole("navigation", { name: "Chapter 목차" }),
        ).getByRole("button", {
          name: new RegExp(chapterTitle.replace("?", "\\?")),
        }),
      );

      // Then: page, Diagram, focus, progress, and side effects are exact.
      expect(
        document.querySelector(`[data-guide-page-id='${pageId}']`),
      ).not.toBeNull();
      expect(screen.getByRole("img", { name: imageName })).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: chapterTitle, level: 1 }),
      ).toHaveFocus();
      const ordinal = PART0_PRODUCTION_CHAPTERS.findIndex(
        ([title]) => title === chapterTitle,
      );
      expect(
        screen.getByText(`현재 Chapter ${ordinal + 1} / 14`),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Visualization/)).toBeNull();
      expect(screen.queryByRole("slider")).toBeNull();
      expect(screen.queryByRole("switch")).toBeNull();
      expect(window.location.href).toBe(hrefBefore);
      expect(window.history.length).toBe(historyBefore);
      expect(worker.posted).toHaveLength(postsBefore);

      // And: reopening the ToC preserves exactly one matching current item.
      await user.click(screen.getByRole("button", { name: "목차 열기" }));
      const toc = screen.getByRole("navigation", { name: "Chapter 목차" });
      expect(
        within(toc).getAllByRole("button", { current: "page" }),
      ).toHaveLength(1);
      expect(
        within(toc).getByRole("button", {
          name: new RegExp(chapterTitle.replace("?", "\\?")),
        }),
      ).toHaveAttribute("aria-current", "page");
    },
  );

  test.each(PART1_PRODUCTION_CHAPTERS)(
    "activates production %s without URL, history, or Worker mutation",
    async (chapterTitle, pageId, imageName) => {
      // Given: a fresh inactive app with side-effect counters.
      const worker = readyCurriculum();
      const user = userEvent.setup();
      const postsBefore = worker.posted.length;
      const hrefBefore = window.location.href;
      const historyBefore = window.history.length;
      await user.click(screen.getByRole("button", { name: "목차 열기" }));

      // When: the Part 1 Chapter is explicitly selected.
      await user.click(
        within(
          screen.getByRole("navigation", { name: "Chapter 목차" }),
        ).getByRole("button", { name: chapterTitle }),
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
      expect(window.location.href).toBe(hrefBefore);
      expect(window.history.length).toBe(historyBefore);
      expect(worker.posted).toHaveLength(postsBefore);
    },
  );

  test("falls back atomically when an activated Part 2 Chapter has no renderers", async () => {
    // Given: production Part 0 has already been explicitly activated.
    const worker = readyCurriculum();
    const user = userEvent.setup();
    const postsBefore = worker.posted.length;
    await user.click(screen.getByRole("button", { name: "목차 열기" }));
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Chapter 목차" }),
      ).getByRole("button", { name: "자연어 처리란?" }),
    );
    await user.click(screen.getByRole("button", { name: "목차 열기" }));

    // When: a Chapter without both production resolvers is selected.
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Chapter 목차" }),
      ).getByRole("button", { name: "Token Embedding" }),
    );

    // Then: only the incumbent architecture mounts without a flash.
    expect(screen.getByTestId("architecture-root")).toBeInTheDocument();
    expect(
      document.querySelector(
        "[data-guide-page-id='decoder.curriculum.guide.2.1']",
      ),
    ).toBeNull();
    expect(screen.queryByText("Focus target unavailable.")).toBeNull();
    expect(worker.posted).toHaveLength(postsBefore);
  });

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
