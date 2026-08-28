import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CourseHome } from "./CourseHome";

describe("Course Home frontispiece", () => {
  test("presents primary Learn and secondary Lab routes", () => {
    render(<CourseHome />);

    const journey = screen.getByRole("list", { name: "학습 순서" });
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
