import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CourseHome } from "./CourseHome";

describe("Course Home frontispiece", () => {
  test("presents primary Learn and secondary Lab routes", () => {
    render(<CourseHome />);

    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Transformer를 처음부터 살펴봅니다",
    });
    expect(
      Array.from(heading.querySelectorAll("[data-home-title-word]")).map(
        (word) => word.textContent,
      ),
    ).toEqual(["Transformer를", "처음부터", "살펴봅니다"]);
    const journey = screen.getByRole("list", { name: "학습 순서" });
    expect(
      journey.closest('[data-threeui-surface="course"]'),
    ).toBeInTheDocument();
    expect(
      journey.closest('[data-threeui-surface="course-home"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-boundary-id="home-final"]'),
    ).toHaveAttribute("data-boundary-kind", "structural");
    const steps = within(journey).getAllByRole("listitem");
    expect(journey.tagName).toBe("OL");
    expect(steps).toHaveLength(7);
    expect(
      steps.every(
        (step) =>
          step.querySelector("[data-course-step-number]") !== null &&
          step.querySelector("[data-course-step-title]") !== null &&
          step.querySelector("[data-course-step-summary]") !== null,
      ),
    ).toBe(true);
    expect(screen.getByRole("link", { name: "처음부터 시작" })).toHaveAttribute(
      "href",
      "#/learn/decoder-only-fundamentals/0-1",
    );
    expect(screen.getByRole("link", { name: "Lab으로 가기" })).toHaveAttribute(
      "href",
      "#/lab",
    );
    expect(screen.getByRole("link", { name: "언어 모델" })).toHaveAttribute(
      "href",
      "#/learn/decoder-only-fundamentals/1-1",
    );
  });

  test("scrolls 목차 to the journey without changing the route hash", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/#/course-home");
    render(<CourseHome />);
    const journey = screen.getByRole("list", { name: "학습 순서" });
    const scrollIntoView = vi.fn();
    journey.scrollIntoView = scrollIntoView;

    await user.click(screen.getByRole("button", { name: "목차" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    expect(window.location.hash).toBe("#/course-home");
  });
});
