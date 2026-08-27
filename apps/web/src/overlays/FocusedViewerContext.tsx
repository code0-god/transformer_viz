import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FocusedViewerContext,
  type FocusedViewerContextValue,
} from "./focusedViewerStore";
import type { FocusedViewerRequest } from "./focusedViewerTypes";
import { OverlayHost } from "./OverlayHost";

export function FocusedViewerProvider({
  children,
}: Readonly<{ children: ReactNode }>): ReactElement {
  const [request, setRequest] = useState<FocusedViewerRequest | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const returnTargetRef = useRef<string | null>(null);

  const openViewer = useCallback((nextRequest: FocusedViewerRequest): void => {
    triggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setRequest(nextRequest);
  }, []);

  const closeViewer = useCallback((): void => {
    setRequest(null);
  }, []);

  const setArticleTarget = useCallback((articleTargetId: string): void => {
    setRequest((current) =>
      current === null ? current : { ...current, articleTargetId },
    );
  }, []);

  const returnToArticle = useCallback((): void => {
    const articleTargetId = request?.articleTargetId;
    returnTargetRef.current = articleTargetId ?? null;
    setRequest(null);
  }, [request?.articleTargetId]);

  const handleAfterClose = useCallback((): void => {
    const articleTargetId = returnTargetRef.current;
    returnTargetRef.current = null;
    if (articleTargetId === null) return;
    const target = document.getElementById(articleTargetId);
    if (!(target instanceof HTMLElement)) return;
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (typeof target.scrollIntoView === "function") {
      target.scrollIntoView({
        block: "center",
        behavior: reducedMotion ? "auto" : "smooth",
      });
    }
  }, []);

  const value = useMemo<FocusedViewerContextValue>(
    () => ({
      request,
      openViewer,
      closeViewer,
      setArticleTarget,
      returnToArticle,
    }),
    [closeViewer, openViewer, request, returnToArticle, setArticleTarget],
  );

  return (
    <FocusedViewerContext value={value}>
      {children}
      {request === null ? null : (
        <OverlayHost
          request={request}
          triggerElement={triggerRef.current}
          onAfterClose={handleAfterClose}
          onClose={closeViewer}
          onArticleTargetChange={setArticleTarget}
          onReturnToArticle={returnToArticle}
        />
      )}
    </FocusedViewerContext>
  );
}
