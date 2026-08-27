import { createContext, useContext } from "react";

import type { FocusedViewerRequest } from "./focusedViewerTypes";

export type FocusedViewerContextValue = Readonly<{
  request: FocusedViewerRequest | null;
  openViewer: (request: FocusedViewerRequest) => void;
  closeViewer: () => void;
  setArticleTarget: (articleTargetId: string) => void;
  returnToArticle: () => void;
}>;

export const FocusedViewerContext =
  createContext<FocusedViewerContextValue | null>(null);

class FocusedViewerContextError extends Error {
  constructor() {
    super("Focused viewer context is unavailable");
    this.name = "FocusedViewerContextError";
  }
}

export function useFocusedViewer(): FocusedViewerContextValue {
  const value = useContext(FocusedViewerContext);
  if (value === null) throw new FocusedViewerContextError();
  return value;
}
