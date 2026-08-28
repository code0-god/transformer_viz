import {
  type ReactElement,
  type PointerEvent as ReactPointerEvent,
  useLayoutEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";

import { FocusedViewerContent } from "./focusedViewerRegistry";
import type { FocusedViewerRequest } from "./focusedViewerTypes";
import "./focusedViewer.css";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

type OverlayHostProps = Readonly<{
  request: FocusedViewerRequest;
  triggerElement: HTMLElement | null;
  onClose: () => void;
}>;

function focusableElements(container: HTMLElement): readonly HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => !element.hasAttribute("hidden"));
}

export function OverlayHost({
  request,
  triggerElement,
  onClose,
}: OverlayHostProps): ReactElement {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const backdropPointerRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const applicationRoot =
      document.querySelector<HTMLElement>(".architecture-app");
    const body = document.body;
    const scrollY = window.scrollY;
    const previousRootHidden = applicationRoot?.getAttribute("aria-hidden");
    const rootWasInert = applicationRoot?.hasAttribute("inert") ?? false;
    const previousBodyStyle = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    applicationRoot?.setAttribute("inert", "");
    applicationRoot?.setAttribute("aria-hidden", "true");
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";

    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || dialogRef.current === null) return;
      const elements = focusableElements(dialogRef.current);
      const first = elements[0];
      const last = elements.at(-1);
      if (first === undefined || last === undefined) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (!rootWasInert) applicationRoot?.removeAttribute("inert");
      if (previousRootHidden === null || previousRootHidden === undefined) {
        applicationRoot?.removeAttribute("aria-hidden");
      } else {
        applicationRoot?.setAttribute("aria-hidden", previousRootHidden);
      }
      body.style.position = previousBodyStyle.position;
      body.style.top = previousBodyStyle.top;
      body.style.width = previousBodyStyle.width;
      body.style.overflow = previousBodyStyle.overflow;
      if (scrollY !== 0) window.scrollTo(0, scrollY);
      if (triggerElement?.isConnected === true) triggerElement.focus();
    };
  }, [onClose, triggerElement]);

  function handleBackdropPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ): void {
    backdropPointerRef.current =
      event.target === event.currentTarget ? event.pointerId : null;
  }

  function handleBackdropPointerUp(
    event: ReactPointerEvent<HTMLDivElement>,
  ): void {
    const closes =
      backdropPointerRef.current === event.pointerId &&
      event.target === event.currentTarget;
    backdropPointerRef.current = null;
    if (closes) onClose();
  }

  return createPortal(
    <div
      className="focused-viewer-backdrop"
      data-viewer-backdrop=""
      onPointerDown={handleBackdropPointerDown}
      onPointerUp={handleBackdropPointerUp}
      onPointerCancel={() => {
        backdropPointerRef.current = null;
      }}
    >
      <section
        ref={dialogRef}
        id="focused-viewer"
        className="focused-viewer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="focused-viewer-title"
        aria-describedby={
          request.description === undefined
            ? undefined
            : "focused-viewer-description"
        }
        data-viewer-kind={request.kind}
        data-viewer-source={request.source}
        tabIndex={-1}
      >
        <header className="focused-viewer__header">
          <div>
            <h2 id="focused-viewer-title">{request.title}</h2>
            {request.description === undefined ? null : (
              <p id="focused-viewer-description">{request.description}</p>
            )}
          </div>
          <div className="focused-viewer__header-actions">
            <button
              ref={closeRef}
              type="button"
              className="focused-viewer__close"
              aria-label="집중 보기 닫기"
              onClick={onClose}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          </div>
        </header>
        <div className="focused-viewer__body">
          <FocusedViewerContent request={request} />
        </div>
      </section>
    </div>,
    document.body,
  );
}
