import type { RenderResult } from "@testing-library/react";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test } from "vitest";
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

    test("renders Lab from #/lab with Prompt, Generate, Continuation, Architecture, and one Worker initialize", () => {
      const { worker } = renderRouteApp(renderApp, "#/lab");
      readyWorker(worker);

      expect(
        screen.getByText("Prompt", { selector: "#prompt-label" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Generate", { selector: "[data-testid='generate']" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Decoded continuation", { selector: "h2" }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("architecture-root")).toBeInTheDocument();
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
