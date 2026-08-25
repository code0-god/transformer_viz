import { describe, expect, test, vi } from "vitest";

import {
  beginCurriculumNavigation,
  type CurriculumDestination,
  consumeDestinationRegistration,
  createCurriculumFocusHandoff,
  initialCurriculumState,
  selectCurriculumChapter,
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

describe("curriculum focus handoff state", () => {
  test("keeps explanation as the initial pane and has no pending destination", () => {
    // Given/When: curriculum state is initialized.
    // Then: the first Chapter starts without speculative route work.
    expect(initialCurriculumState).toEqual({
      chapterId: "decoder.chapter.0.1",
      isActive: false,
      pending: null,
    });
  });

  test("explicit selection activates while preserving pending state", () => {
    // Given: a pending destination exists before a Chapter selection.
    const state = { ...initialCurriculumState, pending: destination };

    // When: the learner explicitly selects an in-place Chapter.
    const selected = selectCurriculumChapter(state, "decoder.chapter.0.2");

    // Then: Chapter identity and activation change without dropping pending work.
    expect(selected).toEqual({
      chapterId: "decoder.chapter.0.2",
      isActive: true,
      pending: destination,
    });
  });

  test("cross-route navigation activates before recording its destination", () => {
    // Given/When: navigation begins from the inactive initial state.
    const pending = beginCurriculumNavigation(
      initialCurriculumState,
      "decoder.chapter.4.1",
      destination,
    );

    // Then: activation and Chapter selection accompany the pending destination.
    expect(pending).toEqual({
      chapterId: "decoder.chapter.4.1",
      isActive: true,
      pending: destination,
    });
  });

  test("retains pending focus for a mismatched registration", () => {
    // Given: navigation has subscribed to the Block destination.
    const pending = beginCurriculumNavigation(
      initialCurriculumState,
      "decoder.chapter.4.1",
      destination,
    );

    // When: a stale Root registration arrives.
    const next = consumeDestinationRegistration(
      pending,
      registration({ routeId: "decoder.root" }),
    );

    // Then: the durable destination remains pending and receives no focus.
    expect(next.pending).toEqual(destination);
    expect(document.activeElement).toBe(document.body);
  });

  test("matching layout registration consumes and focuses exactly once", () => {
    // Given: navigation subscribed before transition.
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    const pending = beginCurriculumNavigation(
      initialCurriculumState,
      "decoder.chapter.4.1",
      destination,
    );
    const target = registration();

    // When: the exact destination registers after mount.
    const consumed = consumeDestinationRegistration(pending, target);
    const repeated = consumeDestinationRegistration(consumed, target);

    // Then: reveal/focus is one-shot and stale re-registration is inert.
    expect(consumed.pending).toBeNull();
    expect(repeated.pending).toBeNull();
    expect(focus).toHaveBeenCalledTimes(1);
    focus.mockRestore();
  });

  test("subscribes before transition and reveals only an exact registration", () => {
    // Given: a handoff trace and a mounted destination heading.
    const trace: string[] = [];
    const handoff = createCurriculumFocusHandoff((event) => trace.push(event));
    const target = registration();

    // When: transition is triggered, a mismatch arrives, then the match registers.
    handoff.navigate(destination, () => undefined);
    handoff.register({ ...target, sectionId: "block-input" });
    expect(handoff.pending()).toEqual(destination);
    handoff.register(target);
    handoff.register(target);

    // Then: the exact lifecycle is ordered and consumed once.
    expect(trace).toEqual([
      "subscribe",
      "transition",
      "matching register",
      "reveal",
      "focus",
    ]);
    expect(handoff.pending()).toBeNull();
    expect(document.activeElement).toBe(target.element);
  });

  test("does not reveal before destination registration", () => {
    // Given: the focus method is observable.
    const focus = vi.spyOn(HTMLElement.prototype, "focus");

    // When: navigation begins but no registration is emitted.
    const pending = beginCurriculumNavigation(
      initialCurriculumState,
      "decoder.chapter.4.1",
      destination,
    );

    // Then: the pending state remains unrevealed without polling or delay.
    expect(pending.pending).toEqual(destination);
    expect(focus).not.toHaveBeenCalled();
    focus.mockRestore();
  });
});
