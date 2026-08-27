export function observeDiagramResize(
  viewport: Element | null,
  content: Element,
  onResize: () => void,
): () => void {
  if (typeof ResizeObserver === "undefined") {
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }

  const observer = new ResizeObserver(onResize);
  if (viewport !== null) observer.observe(viewport);
  observer.observe(content);
  if (content.firstElementChild !== null) {
    observer.observe(content.firstElementChild);
  }
  return () => observer.disconnect();
}
