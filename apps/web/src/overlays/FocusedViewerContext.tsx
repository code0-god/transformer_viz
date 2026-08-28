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

  const value = useMemo<FocusedViewerContextValue>(
    () => ({
      request,
      openViewer,
      closeViewer,
    }),
    [closeViewer, openViewer, request],
  );

  return (
    <FocusedViewerContext value={value}>
      {children}
      {request === null ? null : (
        <OverlayHost
          request={request}
          triggerElement={triggerRef.current}
          onClose={closeViewer}
        />
      )}
    </FocusedViewerContext>
  );
}
