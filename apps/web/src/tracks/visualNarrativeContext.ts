import { createContext, useContext } from "react";

export type VisualNarrativeContextValue = Readonly<{
  activeStage: string;
  selectStage: (stage: string) => void;
}>;

export const VisualNarrativeContext =
  createContext<VisualNarrativeContextValue | null>(null);

export function useVisualNarrative(): VisualNarrativeContextValue | null {
  return useContext(VisualNarrativeContext);
}
