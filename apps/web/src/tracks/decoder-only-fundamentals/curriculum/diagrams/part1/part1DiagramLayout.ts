import { useSyncExternalStore } from "react";

const MOBILE_LAYOUT_QUERY = "(max-width: 44rem)";

function subscribeToMobileLayout(onStoreChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const query = window.matchMedia(MOBILE_LAYOUT_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function mobileLayoutSnapshot(): boolean {
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia(MOBILE_LAYOUT_QUERY).matches;
}

export function usePart1MobileLayout(): boolean {
  return useSyncExternalStore(
    subscribeToMobileLayout,
    mobileLayoutSnapshot,
    () => false,
  );
}
