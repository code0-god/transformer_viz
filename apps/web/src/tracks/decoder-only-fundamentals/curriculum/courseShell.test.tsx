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

describe("decoder curriculum shell", () => {
  test("keeps the desktop curriculum shell bounded and the guide pane independently scrollable", () => {
    expect(curriculumCss).toMatch(
      /\.curriculum-workspace\s*{[^}]*max-inline-size:\s*100%;/s,
    );
    expect(curriculumCss).toMatch(
      /@media \(min-width:\s*80rem\)[\s\S]*\.curriculum-workspace \.learning-workspace__body\s*{[^}]*grid-template-columns:\s*minmax\(0, 48fr\) minmax\(0, 52fr\);/s,
    );
    expect(curriculumCss).toMatch(
      /@media \(min-width:\s*80rem\)[\s\S]*\.curriculum-workspace \.learning-workspace__pane--diagram\s*{[^}]*position:\s*static;/s,
    );
    expect(curriculumCss).toMatch(
      /\.curriculum-workspace\s+\.learning-workspace__pane--guide\s*{[^}]*overflow-y:\s*auto;/s,
    );
  });

  test("stacks the curriculum body on tablet and mobile widths", () => {
    expect(curriculumCss).toMatch(
      /@media \(max-width:\s*79\.999rem\)[\s\S]*\.curriculum-workspace__header\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s,
    );
    expect(curriculumCss).toMatch(
      /@media \(max-width:\s*79\.999rem\)[\s\S]*\.curriculum-workspace \.learning-workspace__body\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s,
    );
    expect(curriculumCss).toMatch(
      /@media \(max-width:\s*79\.999rem\)[\s\S]*\.curriculum-workspace \.learning-workspace__pane--diagram\s*{[^}]*position:\s*static;/s,
    );
    expect(curriculumCss).toMatch(
      /@media \(max-width:\s*40rem\)[\s\S]*\.curriculum-toc\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s,
    );
  });
});
