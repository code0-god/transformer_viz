import type { ComponentType } from "react";

export type LearningSceneViewport = "desktop" | "mobile";

export type LearningSceneRendererProps<State extends object> = Readonly<{
  onContextCreated: () => void;
  onContextDisposed: () => void;
  onContextLost: () => void;
  onContextRestored: () => void;
  onFrame: () => void;
  reducedMotion: boolean;
  sceneId: string;
  state: State;
  viewport: LearningSceneViewport;
}>;

export type LearningSceneModule<State extends object> = Readonly<{
  default: ComponentType<LearningSceneRendererProps<State>>;
}>;
