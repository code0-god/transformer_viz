import { render } from "@testing-library/react";
import { vi } from "vitest";

const fiber = vi.hoisted(() => ({
  canvasProps: undefined as Record<string, unknown> | undefined,
}));

vi.mock("@react-three/fiber", () => ({
  Canvas: (props: Record<string, unknown>) => {
    fiber.canvasProps = props;
    return <div data-testid="canvas" />;
  },
  useThree: vi.fn(),
}));

import { LearningSceneCanvas } from "./LearningSceneCanvas";

test("uses a stable event source during asynchronous Canvas setup", () => {
  render(
    <LearningSceneCanvas
      camera={{ fov: 40, position: [0, 0, 8] }}
      onContextCreated={vi.fn()}
      onContextDisposed={vi.fn()}
      onContextLost={vi.fn()}
      onContextRestored={vi.fn()}
      sceneId="test-scene"
      viewport="desktop"
    >
      <div />
    </LearningSceneCanvas>,
  );

  expect(fiber.canvasProps?.["eventSource"]).toBe(document.body);
});
