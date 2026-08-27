import { describe, expect, test, vi } from "vitest";

import {
  type CurriculumDestination,
  createCurriculumFocusHandoff,
} from "./curriculumState";

const destination: CurriculumDestination = {
  routeId: "decoder.block",
  sectionId: "block-overview",
  nodeId: "decoder.root.transformer-block",
};

function registration(overrides: Partial<CurriculumDestination> = {}) {
  const element = document.createElement("h2");
  element.tabIndex = -1;
  document.body.append(element);
  return { ...destination, ...overrides, element };
}

describe("curriculum focus handoff", () => {
  test("subscribes before transition and focuses only the exact registration", () => {
    const events: string[] = [];
    const handoff = createCurriculumFocusHandoff((event) => events.push(event));
    const transition = vi.fn(() => events.push("transition callback"));
    const wrong = registration({ sectionId: "wrong-section" });
    const matching = registration();
    const focus = vi.spyOn(matching.element, "focus");

    handoff.navigate(destination, transition);
    handoff.register(wrong);
    expect(handoff.pending()).toEqual(destination);
    expect(focus).not.toHaveBeenCalled();

    handoff.register(matching);

    expect(events).toEqual([
      "subscribe",
      "transition",
      "transition callback",
      "matching register",
      "reveal",
      "focus",
    ]);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(handoff.pending()).toBeNull();
  });

  test("ignores registrations when no Chapter transition is pending", () => {
    const events: string[] = [];
    const handoff = createCurriculumFocusHandoff((event) => events.push(event));
    const candidate = registration();
    const focus = vi.spyOn(candidate.element, "focus");

    handoff.register(candidate);

    expect(events).toEqual([]);
    expect(focus).not.toHaveBeenCalled();
    expect(handoff.pending()).toBeNull();
  });
});
