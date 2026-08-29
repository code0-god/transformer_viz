import "@testing-library/jest-dom/vitest";

window.scrollTo = () => undefined;

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: () => null,
});
