import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { LearningWorkspace } from "./LearningWorkspace";

const route = {
  id: "decoder.root",
  title: "Route title",
  subtitle: "Route subtitle",
} as const;

describe("LearningWorkspace", () => {
  test("renders article content without a viewer capability", () => {
    render(
      <LearningWorkspace
        route={route}
        status={{ availability: "available" }}
        headerControls={<button type="button">Header control</button>}
        guide={{
          label: "Guide content",
          content: <article>ARTICLE_SENTINEL</article>,
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Route title" })).toBeVisible();
    expect(screen.getByRole("article")).toHaveTextContent("ARTICLE_SENTINEL");
    expect(
      screen.getByRole("button", { name: "Header control" }),
    ).toBeEnabled();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector("[aria-haspopup='dialog']")).toBeNull();
    expect(
      document.querySelector("[data-learning-layout='article']"),
    ).not.toBeNull();
  });

  test("reports unavailable focus state without changing the article", () => {
    render(
      <LearningWorkspace
        route={route}
        status={{ availability: "unavailable" }}
        presentation="chapter"
        guide={{
          label: "Guide content",
          content: <article>ARTICLE_SENTINEL</article>,
        }}
      />,
    );

    expect(screen.queryByRole("heading", { name: "Route title" })).toBeNull();
    expect(screen.getByRole("article")).toBeVisible();
    expect(screen.getByRole("status")).toHaveAttribute(
      "data-focus-availability",
      "unavailable",
    );
  });
});
