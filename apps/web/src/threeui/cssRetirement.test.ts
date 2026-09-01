import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ThreeUI Phase 1 CSS retirement", () => {
  test("removes migrated product selectors from the global stylesheet", () => {
    const globalCss = source("style.css");
    const retiredSelectors = [
      ".architecture-header",
      ".brand-lockup",
      ".app-navigation",
      ".lifecycle",
      ".status-badge",
      ".course-home",
      ".lab-introduction",
      ".generation-bar",
      ".generation-primary",
      ".generation-settings",
      ".prompt-field",
    ];

    for (const selector of retiredSelectors) {
      expect(globalCss, selector).not.toContain(selector);
    }
    expect(globalCss).not.toMatch(/\.architecture-app\s*\{/);
    expect(globalCss).not.toMatch(
      /button,\s*\ninput,\s*\ntextarea,\s*\nselect\s*\{/,
    );
  });

  test("keeps shared controls and migrated surfaces under explicit owners", () => {
    const globalCss = source("style.css");
    const bridge = source("src/threeui/threeUi.css");
    const layout = source("src/layout/pageLayout.css");
    const header = source("src/components/Header.css");
    const home = source("src/components/CourseHome.css");
    const lab = source("src/components/LabWorkspace.css");

    expect(bridge).toMatch(
      /\.threeui-root\s+:where\(button, input, textarea, select\)/,
    );
    expect(layout).toMatch(
      /\.page-layout\s*\{[^}]*\[full-start\][^}]*\[content-start\][^}]*\[full-end\]/s,
    );
    expect(layout).not.toMatch(/100vw|100dvw|margin-inline:\s*calc\(/);
    expect(globalCss).toMatch(/html\s*\{[^}]*min-inline-size:\s*0;[^}]*\}/s);
    expect(globalCss).not.toContain("scrollbar-gutter");
    expect(header).toContain(".architecture-header");
    expect(header).toMatch(
      /\.app-navigation\s*\{[^}]*display:\s*flex;[^}]*\}/s,
    );
    expect(header).toMatch(
      /\.app-navigation a\s*\{[^}]*display:\s*inline-flex;[^}]*\}/s,
    );
    expect(home).toContain('.course-home[data-threeui-surface="course-home"]');
    expect(home).toMatch(
      /\.course-home__content\s*\{[^}]*inline-size:\s*min\(100%,\s*80rem\);[^}]*justify-self:\s*center;[^}]*\}/s,
    );
    expect(lab).toContain(
      '.generation-bar[data-threeui-surface="generation-controls"]',
    );
  });

  test("keeps the static startup shell independent from product classes", () => {
    const index = source("index.html");
    const globalCss = source("style.css");

    expect(index).not.toContain("brand-lockup");
    expect(index).not.toContain("status-badge");
    expect(index).not.toContain("stage-position");
    expect(index).toContain("startup-shell__brand");
    expect(index).toContain("startup-shell__status");
    expect(index).toContain("startup-shell__stage");
    expect(globalCss).toContain(".startup-shell__brand");
    expect(globalCss).toContain(".startup-shell__status");
    expect(globalCss).toContain(".startup-shell__stage");
  });
});
