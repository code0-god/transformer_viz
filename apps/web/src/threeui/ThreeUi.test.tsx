import { globSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThreeUiAction, ThreeUiIconAction, ThreeUiProvider } from "./ThreeUi";

function sourceFiles(directory: string): string[] {
  return globSync(["**/*.css", "**/*.ts", "**/*.tsx"], {
    cwd: directory,
  }).map((path) => resolve(directory, path));
}

function hexToken(css: string, name: string): string {
  const value = new RegExp(
    `--${name}:\\s*(#[\\da-f]{6}|#[\\da-f]{3})`,
    "i",
  ).exec(css)?.[1];
  if (value === undefined) throw new Error(`Missing hex token: ${name}`);
  return value.length === 4
    ? `#${value
        .slice(1)
        .split("")
        .map((digit) => `${digit}${digit}`)
        .join("")}`
    : value;
}

function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string): number => {
    const channels = [1, 3, 5].map((offset) => {
      const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return (
      0.2126 * (channels[0] ?? 0) +
      0.7152 * (channels[1] ?? 0) +
      0.0722 * (channels[2] ?? 0)
    );
  };
  const values = [luminance(foreground), luminance(background)].sort(
    (left, right) => right - left,
  );
  return ((values[0] ?? 0) + 0.05) / ((values[1] ?? 0) + 0.05);
}

describe("ThreeUI product adapters", () => {
  test("marks the canonical product theme without changing child semantics", () => {
    render(
      <ThreeUiProvider>
        <main aria-label="학습 애플리케이션">내용</main>
      </ThreeUiProvider>,
    );

    expect(
      screen.getByRole("main", { name: "학습 애플리케이션" }),
    ).toHaveTextContent("내용");
    expect(
      screen.getByRole("main", { name: "학습 애플리케이션" }).parentElement,
    ).toHaveAttribute("data-threeui-theme", "canonical");
  });

  test("ships the allowlisted package action behind native button semantics", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<ThreeUiAction label="생성" onClick={onClick} type="button" />);

    const action = screen.getByRole("button", { name: "생성" });
    expect(action.closest(".lumen-cta")).toBeInTheDocument();

    await user.click(action);

    expect(onClick).toHaveBeenCalledOnce();
  });

  test("preserves disabled state through the package boundary", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <ThreeUiAction
        disabled
        label="생성 중"
        onClick={onClick}
        type="submit"
        variant="quiet"
      />,
    );

    const action = screen.getByRole("button", { name: "생성 중" });
    expect(action).toBeDisabled();
    expect(action).toHaveAttribute("type", "submit");

    await user.click(action);

    expect(onClick).not.toHaveBeenCalled();
  });

  test("ships overlay close chrome through the package icon boundary", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <ThreeUiIconAction
        ariaLabel="집중 보기 닫기"
        onClick={onClick}
        type="button"
      />,
    );

    const action = screen.getByRole("button", { name: "집중 보기 닫기" });
    expect(action.closest(".circle-buttons")).toBeInTheDocument();

    await user.click(action);

    expect(onClick).toHaveBeenCalledOnce();
  });

  test("keeps the vendor action at a 44px minimum touch target", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/threeui/threeUi.css"),
      "utf8",
    );

    expect(css).toMatch(
      /\.threeui-action \.lumen-cta__button\s*\{[^}]*min-block-size:\s*44px/s,
    );
    expect(css).toMatch(
      /\.threeui-icon-action \.circle-button\s*\{[^}]*min-block-size:\s*44px/s,
    );
  });

  test("keeps the neutral token bridge and Korean font stack application-owned", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/threeui/threeUi.css"),
      "utf8",
    );
    const globalCss = readFileSync(resolve(process.cwd(), "style.css"), "utf8");

    for (const token of [
      "--ui-page",
      "--ui-reading",
      "--ui-surface",
      "--ui-text",
      "--ui-border",
      "--ui-accent",
    ]) {
      expect(css).toContain(token);
    }
    expect(css).toContain(
      '"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo"',
    );
    for (const alias of [
      "--bg-page: var(--ui-page)",
      "--bg-article: var(--ui-reading)",
      "--surface-subtle: var(--ui-surface-subtle)",
      "--text-primary: var(--ui-text)",
      "--border-subtle: var(--ui-border)",
      "--accent: var(--ui-accent)",
    ]) {
      expect(globalCss).toContain(alias);
    }
  });

  test("rejects the package-global stylesheet throughout application source", () => {
    const forbiddenImport = ["@designcodeio/threeui", "style.css"].join("/");
    const applicationFiles = sourceFiles(resolve(process.cwd(), "src")).filter(
      (path) => /\.(?:css|ts|tsx)$/.test(path),
    );

    for (const path of applicationFiles) {
      expect(readFileSync(path, "utf8"), path).not.toContain(forbiddenImport);
    }
  });

  test("pins isolated production versions and lazy renderer imports", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies: Record<string, string>;
    };
    const adapters = readFileSync(
      resolve(process.cwd(), "src/threeui/ThreeUi.tsx"),
      "utf8",
    );
    const registry = readFileSync(
      resolve(
        process.cwd(),
        "src/tracks/visualization/visualizationRegistry.ts",
      ),
      "utf8",
    );

    expect(packageJson.dependencies).toMatchObject({
      "@designcodeio/threeui": "1.1.0",
      "@react-three/fiber": "9.7.0",
      three: "0.185.1",
    });
    expect(adapters).toContain('"@designcodeio/threeui/components/LumenCta"');
    expect(adapters).toContain(
      '"@designcodeio/threeui/components/CircleButtons"',
    );
    expect(registry).toContain('import("./score-matrix/ScoreMatrixScene")');
  });

  test("keeps canonical text and status pairs above WCAG AA contrast", () => {
    const bridge = readFileSync(
      resolve(process.cwd(), "src/threeui/threeUi.css"),
      "utf8",
    );
    const globalCss = readFileSync(resolve(process.cwd(), "style.css"), "utf8");
    const pairs = [
      ["ui-text", "ui-page", bridge],
      ["ui-text-muted", "ui-page", bridge],
      ["ui-text-muted", "ui-surface", bridge],
      ["ui-text-soft", "ui-page", bridge],
      ["ui-text-soft", "ui-surface", bridge],
      ["ui-accent", "ui-surface", bridge],
      ["ui-ready", "ready-soft", `${bridge}\n${globalCss}`],
      ["ui-error", "error-soft", `${bridge}\n${globalCss}`],
    ] as const;

    for (const [foreground, background, css] of pairs) {
      expect(
        contrastRatio(hexToken(css, foreground), hexToken(css, background)),
        `${foreground} on ${background}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
