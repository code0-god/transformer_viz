import { describe, expect, test } from "vitest";

import {
  calculateFitTransform,
  calculateZoomTransform,
  clampPan,
  zoomAtPoint,
} from "./diagramViewportTransform";

describe("diagram viewport transforms", () => {
  test("centers the full content when width determines Fit", () => {
    // Given
    const viewport = { width: 800, height: 600 };
    const content = { width: 1200, height: 400 };

    // When
    const transform = calculateFitTransform(viewport, content);

    // Then
    expect(transform).toEqual({
      scale: 2 / 3,
      x: 0,
      y: (600 - 400 * (2 / 3)) / 2,
    });
  });

  test("centers the full content when height determines Fit", () => {
    // Given
    const viewport = { width: 400, height: 800 };
    const content = { width: 200, height: 1000 };

    // When
    const transform = calculateFitTransform(viewport, content);

    // Then
    expect(transform).toEqual({ scale: 0.8, x: 120, y: 0 });
  });

  test("keeps the diagram point beneath the pointer while zooming", () => {
    // Given
    const transform = { scale: 0.5, x: 0, y: 125 };

    // When
    const zoomed = zoomAtPoint(transform, 0.6, { x: 200, y: 100 });

    // Then
    expect(zoomed).toEqual({ scale: 0.6, x: -40, y: 130 });
  });

  test("clamps pan without displacing content smaller than one axis", () => {
    // Given
    const transform = { scale: 0.8, x: 200, y: -200 };

    // When
    const clamped = clampPan(
      transform,
      { width: 500, height: 500 },
      { width: 1000, height: 400 },
    );

    // Then
    expect(clamped).toEqual({ scale: 0.8, x: 0, y: 90 });
  });

  test("keeps maximum edge zoom within both viewport axes", () => {
    const geometry = {
      viewport: { width: 500, height: 500 },
      content: { width: 1000, height: 400 },
      fit: { scale: 0.5, x: 0, y: 150 },
    };

    const zoomed = calculateZoomTransform(geometry.fit, geometry, {
      scale: 2,
      point: { x: 0, y: 500 },
    });

    expect(zoomed).toEqual({ scale: 2, x: 0, y: -300 });
  });
});
