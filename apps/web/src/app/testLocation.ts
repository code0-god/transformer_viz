import type { RenderResult } from "@testing-library/react";
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { TestWorker } from "../test/workerFixtures";

const BASE_PATH = window.location.pathname;

type AppRouteTestEnv = Readonly<{
  renderApp: (hash?: string) => {
    readonly worker: TestWorker;
    readonly rendered: RenderResult;
  };
  readyWorker: (worker: TestWorker) => void;
}>;

export function resetAppLocation(): void {
  window.history.replaceState(null, "", BASE_PATH);
}

export function setAppLocation(hash: string): void {
  window.history.replaceState(null, "", `${BASE_PATH}${hash}`);
}

export function nextHashChange(): Promise<HashChangeEvent> {
  return new Promise((resolve) => {
    window.addEventListener("hashchange", resolve, { once: true });
  });
}

function assertCourseHome(): void {
  expect(
    screen.getByRole("heading", {
      name: "Decoder-only Transformer 기초",
      level: 2,
    }),
  ).toBeVisible();
  expect(
    screen.queryByText("Prompt", { selector: "#prompt-label" }),
  ).toBeNull();
  expect(
    screen.queryByText("Generate", { selector: "[data-testid='generate']" }),
  ).toBeNull();
}

function assertChapter0_1(): void {
  expect(
    screen.getByRole("heading", { name: "자연어 처리란?", level: 1 }),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("Prompt", { selector: "#prompt-label" }),
  ).toBeNull();
  expect(
    screen.queryByText("Generate", { selector: "[data-testid='generate']" }),
  ).toBeNull();
}

function renderRouteApp(
  renderApp: AppRouteTestEnv["renderApp"],
  hash: string,
): { readonly worker: TestWorker; readonly rendered: RenderResult } {
  resetAppLocation();
  if (hash !== "") setAppLocation(hash);
  return renderApp(hash);
}

export function registerAppRouteTests({
  renderApp,
  readyWorker,
}: AppRouteTestEnv): void {
  afterEach(() => {
    resetAppLocation();
  });

  describe("App route surface", () => {
    test("shows Course Home and no generation controls at the default hash", () => {
      renderRouteApp(renderApp, "");

      assertCourseHome();
    });

    test("routes ready decoder-only fundamentals from 처음부터 시작 exactly to #/learn/decoder-only-fundamentals/0-1 and renders Chapter 0.1", async () => {
      const { worker } = renderRouteApp(renderApp, "");
      readyWorker(worker);
      const user = userEvent.setup();

      await user.click(screen.getByRole("link", { name: "처음부터 시작" }));

      expect(window.location.hash).toBe(
        "#/learn/decoder-only-fundamentals/0-1",
      );
      assertChapter0_1();
      expect(worker.posted).toHaveLength(1);
    });

    test("renders Lab from #/lab with experiment controls and on-demand inspection", () => {
      const { worker } = renderRouteApp(renderApp, "#/lab");
      readyWorker(worker);

      expect(
        screen.getByText("Prompt", { selector: "#prompt-label" }),
      ).toBeInTheDocument();
      expect(
        screen
          .getByRole("heading", { name: "모델 실험실" })
          .closest('[data-threeui-surface="lab"]'),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Generate", { selector: "[data-testid='generate']" }),
      ).toBeInTheDocument();
      expect(
        screen
          .getByTestId("generate")
          .closest('[data-threeui-surface="generation-controls"]'),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Decoded continuation", { selector: "h2" }),
      ).toBeInTheDocument();
      expect(
        screen
          .getByRole("heading", { name: "Decoded continuation" })
          .closest('[data-threeui-surface="generation-output"]'),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("architecture-root")).toBeNull();
      expect(
        screen.getByTestId("lab-open-architecture-root"),
      ).toBeInTheDocument();
      expect(
        screen
          .getByTestId("lab-open-architecture-root")
          .closest('[data-threeui-surface="inspection-launchers"]'),
      ).toBeInTheDocument();
      expect(worker.posted).toEqual([
        {
          type: "initialize",
          manifest_url: "https://example.test/models/edu/manifest.json",
        },
      ]);
    });

    test("updates the Chapter hash on Next", async () => {
      const { worker } = renderRouteApp(
        renderApp,
        "#/learn/decoder-only-fundamentals/0-1",
      );
      readyWorker(worker);
      const user = userEvent.setup();

      await user.click(screen.getByRole("link", { name: "다음: Token이란?" }));

      expect(window.location.hash).toBe(
        "#/learn/decoder-only-fundamentals/0-2",
      );
    });

    test("renders a direct Chapter hash as Chapter 0.1", () => {
      const { worker } = renderRouteApp(
        renderApp,
        "#/learn/decoder-only-fundamentals/0-1",
      );
      readyWorker(worker);

      assertChapter0_1();
    });

    test("renders Learn as an article with its Figure already inline", () => {
      // Given
      const { worker } = renderRouteApp(
        renderApp,
        "#/learn/decoder-only-fundamentals/0-2",
      );
      readyWorker(worker);

      // Then
      expect(
        document.querySelector('[data-learning-layout="article"]'),
      ).not.toBeNull();
      expect(document.getElementById("learning-diagram-pane")).toBeNull();
      expect(screen.queryByRole("tablist", { name: "학습 보기" })).toBeNull();
      expect(
        screen.getByRole("img", { name: "Token 개념 흐름" }),
      ).toBeVisible();
      expect(screen.queryByTestId("open-diagram-viewer")).toBeNull();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.querySelector(".architecture-app")).not.toHaveAttribute(
        "inert",
      );
      expect(document.body.style.position).toBe("");
      expect(worker.posted).toHaveLength(1);
    });

    test("keeps Lab architecture out of the base flow and opens it in the shared viewer", async () => {
      // Given
      const { worker } = renderRouteApp(renderApp, "#/lab");
      readyWorker(worker);
      const user = userEvent.setup();
      expect(screen.getByRole("textbox", { name: "Prompt" })).toBeVisible();
      expect(screen.getByTestId("generate")).toBeVisible();

      // When
      const trigger = screen.getByTestId("lab-open-architecture-root");
      await user.click(trigger);

      // Then
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeVisible();
      expect(dialog).toHaveAttribute("data-threeui-surface", "focused-viewer");
      expect(
        within(dialog)
          .getByRole("button", { name: "집중 보기 닫기" })
          .closest(".circle-buttons"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("architecture-root")).toBeVisible();

      await user.keyboard("{Escape}");

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByTestId("architecture-root")).toBeNull();
      expect(trigger).toHaveFocus();
      expect(worker.posted).toHaveLength(1);
    });

    test("traps focus, rejects drag-dismiss, and restores page scroll on close", async () => {
      // Given
      const { worker } = renderRouteApp(renderApp, "#/lab");
      readyWorker(worker);
      const user = userEvent.setup();
      const trigger = screen.getByTestId("lab-open-architecture-root");
      const scrollTo = vi
        .spyOn(window, "scrollTo")
        .mockImplementation(() => undefined);
      Object.defineProperty(window, "scrollY", {
        configurable: true,
        value: 180,
      });

      try {
        // When
        await user.click(trigger);
        const dialog = screen.getByRole("dialog");
        const dialogButtons = within(dialog)
          .getAllByRole<HTMLButtonElement>("button")
          .filter((button) => !button.disabled);
        const firstButton = dialogButtons[0];
        const lastButton = dialogButtons.at(-1);

        // Then
        expect(document.body.style.top).toBe("-180px");
        expect(
          within(dialog).getByRole("button", { name: "집중 보기 닫기" }),
        ).toHaveFocus();
        if (lastButton === undefined)
          throw new Error("Viewer controls missing");
        firstButton?.focus();
        await user.keyboard("{Shift>}{Tab}{/Shift}");
        expect(lastButton).toHaveFocus();
        await user.keyboard("{Tab}");
        expect(firstButton).toHaveFocus();

        const backdrop = document.querySelector<HTMLElement>(
          "[data-viewer-backdrop]",
        );
        if (backdrop === null) throw new Error("Viewer backdrop missing");
        fireEvent.pointerDown(dialog, { pointerId: 7 });
        fireEvent.pointerUp(backdrop, { pointerId: 7 });
        expect(screen.getByRole("dialog")).toBeVisible();

        fireEvent.pointerDown(backdrop, { pointerId: 8 });
        fireEvent.pointerUp(backdrop, { pointerId: 8 });
        expect(screen.queryByRole("dialog")).toBeNull();
        expect(trigger).toHaveFocus();
        expect(scrollTo).toHaveBeenCalledWith(0, 180);
      } finally {
        scrollTo.mockRestore();
        Object.defineProperty(window, "scrollY", {
          configurable: true,
          value: 0,
        });
      }
    });

    test("drills through architecture levels inside one viewer", async () => {
      // Given
      const { worker } = renderRouteApp(renderApp, "#/lab");
      readyWorker(worker);
      const user = userEvent.setup();
      await user.click(screen.getByTestId("lab-open-architecture-root"));
      const viewer = screen.getByRole("dialog");

      // When
      expect(screen.getAllByRole("dialog")).toHaveLength(1);
      expect(
        screen.queryByRole("navigation", { name: "Architecture navigation" }),
      ).toBeNull();
      await user.click(
        within(viewer).getByRole("button", {
          name: /반복 Transformer Blocks, 자세히 보기 가능/,
        }),
      );

      // Then
      expect(screen.getAllByRole("dialog")).toHaveLength(1);
      expect(screen.getByTestId("architecture-detail")).toBeVisible();
      expect(
        screen.getByRole("navigation", { name: "Architecture navigation" }),
      ).toBeVisible();

      // When
      await user.click(
        within(viewer).getByRole("button", {
          name: /Causal Multi-Head Self-Attention, 자세히 보기 가능/,
        }),
      );

      // Then
      expect(screen.getAllByRole("dialog")).toHaveLength(1);
      expect(screen.getByTestId("attention-detail")).toBeVisible();
      expect(worker.posted).toHaveLength(1);
    });

    test("falls back to Course Home for an invalid hash", () => {
      renderRouteApp(renderApp, "#/learn/decoder-only-fundamentals/9-9");

      assertCourseHome();
    });

    test("restores Home, Chapter, and Lab across Back and Forward hash history", async () => {
      const { worker } = renderRouteApp(renderApp, "");
      const user = userEvent.setup();
      readyWorker(worker);

      await user.click(screen.getByRole("link", { name: "처음부터 시작" }));
      expect(window.location.hash).toBe(
        "#/learn/decoder-only-fundamentals/0-1",
      );

      const labChange = nextHashChange();
      await user.click(screen.getByRole("link", { name: "모델 실험실" }));
      await act(async () => {
        await labChange;
      });
      expect(window.location.hash).toBe("#/lab");
      expect(
        screen.getByText("Prompt", { selector: "#prompt-label" }),
      ).toBeInTheDocument();

      const chapterChange = nextHashChange();
      await act(async () => {
        window.history.back();
        await chapterChange;
      });
      expect(window.location.hash).toBe(
        "#/learn/decoder-only-fundamentals/0-1",
      );
      assertChapter0_1();

      const homeChange = nextHashChange();
      await act(async () => {
        window.history.back();
        await homeChange;
      });
      expect(window.location.hash).toBe("");
      assertCourseHome();

      const forwardChapterChange = nextHashChange();
      await act(async () => {
        window.history.forward();
        await forwardChapterChange;
      });
      expect(window.location.hash).toBe(
        "#/learn/decoder-only-fundamentals/0-1",
      );
      assertChapter0_1();

      const forwardLabChange = nextHashChange();
      await act(async () => {
        window.history.forward();
        await forwardLabChange;
      });
      expect(window.location.hash).toBe("#/lab");
      expect(
        screen.getByText("Prompt", { selector: "#prompt-label" }),
      ).toBeInTheDocument();
    });
  });
}
