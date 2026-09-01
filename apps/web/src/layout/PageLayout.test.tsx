import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";

import { PageDivider } from "./PageLayout";

describe("canonical page boundary layout", () => {
  test("exposes structural, content, and internal divider roles", () => {
    const { container } = render(
      <>
        <PageDivider boundaryId="structural" />
        <PageDivider boundaryId="content" kind="content" />
        <PageDivider boundaryId="internal" kind="internal" />
      </>,
    );

    expect(
      container.querySelector('[data-boundary-id="structural"]'),
    ).toHaveAttribute("data-boundary-kind", "structural");
    expect(
      container.querySelector('[data-boundary-id="structural"]'),
    ).toHaveClass("page-layout__full");
    expect(container.querySelector('[data-boundary-id="content"]')).toHaveClass(
      "page-layout__content",
    );
    expect(
      container.querySelector('[data-boundary-id="internal"]'),
    ).not.toHaveClass("page-layout__full");
  });

  test("uses named grid lines without viewport-width breakout hacks", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/layout/pageLayout.css"),
      "utf8",
    );

    expect(css).toMatch(/\[full-start\][\s\S]*\[wide-start\]/);
    expect(css).toMatch(/\[content-start\][\s\S]*\[content-end\]/);
    expect(css).toMatch(/\[wide-end\][\s\S]*\[full-end\]/);
    expect(css).not.toMatch(/100vw|100dvw|margin-inline:\s*calc\(/);
  });
});
