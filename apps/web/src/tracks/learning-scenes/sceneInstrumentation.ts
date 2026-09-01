export type LearningSceneMetrics = Readonly<{
  activeCanvasCount: number;
  animationFrameCount: number;
  contextLostCount: number;
  contextRestoredCount: number;
  mountCount: number;
  observerCount: number;
  peakCanvasCount: number;
  unmountCount: number;
  visibleSceneIds: readonly string[];
  webglContextCount: number;
}>;

type MutableLearningSceneMetrics = {
  activeCanvasCount: number;
  animationFrameCount: number;
  contextLostCount: number;
  contextRestoredCount: number;
  mountCount: number;
  observerCount: number;
  peakCanvasCount: number;
  unmountCount: number;
  visibleSceneIds: string[];
  webglContextCount: number;
};

declare global {
  interface Window {
    __learningSceneMetrics?: MutableLearningSceneMetrics;
  }
}

const EMPTY_METRICS = (): MutableLearningSceneMetrics => ({
  activeCanvasCount: 0,
  animationFrameCount: 0,
  contextLostCount: 0,
  contextRestoredCount: 0,
  mountCount: 0,
  observerCount: 0,
  peakCanvasCount: 0,
  unmountCount: 0,
  visibleSceneIds: [],
  webglContextCount: 0,
});

let serverMetrics = EMPTY_METRICS();

function metrics(): MutableLearningSceneMetrics {
  if (typeof window === "undefined") return serverMetrics;
  window.__learningSceneMetrics ??= EMPTY_METRICS();
  return window.__learningSceneMetrics;
}

export function resetLearningSceneMetrics(): void {
  serverMetrics = EMPTY_METRICS();
  if (typeof window !== "undefined") {
    window.__learningSceneMetrics = EMPTY_METRICS();
  }
}

export function readLearningSceneMetrics(): LearningSceneMetrics {
  const current = metrics();
  return {
    ...current,
    visibleSceneIds: [...current.visibleSceneIds],
  };
}

export function recordSceneObserver(delta: 1 | -1): void {
  const current = metrics();
  current.observerCount = Math.max(0, current.observerCount + delta);
}

export function recordSceneVisibility(sceneId: string, visible: boolean): void {
  const current = metrics();
  const ids = new Set(current.visibleSceneIds);
  if (visible) ids.add(sceneId);
  else ids.delete(sceneId);
  current.visibleSceneIds = [...ids];
}

export function recordSceneContextCreated(): void {
  const current = metrics();
  current.mountCount += 1;
  current.activeCanvasCount += 1;
  current.webglContextCount += 1;
  current.peakCanvasCount = Math.max(
    current.peakCanvasCount,
    current.activeCanvasCount,
  );
}

export function recordSceneContextDisposed(): void {
  const current = metrics();
  current.unmountCount += 1;
  current.activeCanvasCount = Math.max(0, current.activeCanvasCount - 1);
  current.webglContextCount = Math.max(0, current.webglContextCount - 1);
}

export function recordSceneFrame(): void {
  metrics().animationFrameCount += 1;
}

export function recordSceneContextLost(): void {
  metrics().contextLostCount += 1;
}

export function recordSceneContextRestored(): void {
  metrics().contextRestoredCount += 1;
}
