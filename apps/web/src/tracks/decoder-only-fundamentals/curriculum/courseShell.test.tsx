import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const curriculumCss = readFileSync(
  resolve(
    process.cwd(),
    "src/tracks/decoder-only-fundamentals/curriculum/curriculum.css",
  ),
  "utf8",
);
const learningWorkspaceCss = readFileSync(
  resolve(process.cwd(), "src/tracks/learningWorkspace.css"),
  "utf8",
);
const globalCss = readFileSync(resolve(process.cwd(), "style.css"), "utf8");

describe("decoder curriculum shell", () => {
  test("uses one centered article instead of a desktop split workspace", () => {
    expect(curriculumCss).toMatch(
      /\.curriculum-workspace\s*{[^}]*max-inline-size:\s*100%;/s,
    );
    expect(curriculumCss).not.toMatch(/48fr|52fr|pane--diagram|pane--guide/);
    expect(learningWorkspaceCss).toMatch(
      /\.learning-workspace__article\s*{[^}]*max-inline-size:\s*72rem;/s,
    );
    expect(learningWorkspaceCss).toMatch(
      /\.learning-workspace__article\s*{[^}]*margin-inline:\s*auto;/s,
    );
    expect(learningWorkspaceCss).not.toMatch(
      /grid-template-columns:\s*48fr 52fr/,
    );
  });

  test("keeps the same content-first model on tablet and mobile", () => {
    expect(curriculumCss).toMatch(
      /@media \(max-width:\s*79\.999rem\)[\s\S]*\.curriculum-workspace__header\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s,
    );
    expect(curriculumCss).toMatch(
      /@media \(max-width:\s*40rem\)[\s\S]*\.curriculum-toc\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s,
    );
    expect(learningWorkspaceCss).not.toMatch(/learning-workspace__pane/);
  });

  test("separates the reading plane without a giant rounded card", () => {
    expect(globalCss).toMatch(
      /body:has\(\.architecture-app\[data-app-view="learn"\]\)\s*\{[^}]*--route-background:\s*var\(--ui-page\);/s,
    );
    expect(learningWorkspaceCss).toMatch(
      /\.learning-workspace__article\s*\{[^}]*border-inline:\s*1px solid var\(--ui-border\);[^}]*background:\s*var\(--ui-reading\);/s,
    );
    expect(learningWorkspaceCss).not.toMatch(
      /\.learning-workspace__article\s*\{[^}]*border-radius:/s,
    );
  });
});
