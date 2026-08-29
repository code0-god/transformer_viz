import {
  type RefObject,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import {
  recordSceneObserver,
  recordSceneVisibility,
} from "./sceneInstrumentation";
import type { LearningSceneViewport } from "./sceneTypes";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onStoreChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function reducedMotionSnapshot(): boolean {
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function useReducedSceneMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    reducedMotionSnapshot,
    () => false,
  );
}

export function useSceneViewport(
  hostRef: RefObject<HTMLElement | null>,
): LearningSceneViewport {
  const [viewport, setViewport] = useState<LearningSceneViewport>(() =>
    typeof window !== "undefined" && window.innerWidth <= 600
      ? "mobile"
      : "desktop",
  );

  useEffect(() => {
    const host = hostRef.current;
    if (host === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry === undefined) return;
      setViewport(entry.contentRect.width <= 600 ? "mobile" : "desktop");
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, [hostRef]);

  return viewport;
}

export function useSceneVisibility(
  hostRef: RefObject<HTMLElement | null>,
  sceneId: string,
): Readonly<{ nearby: boolean; visible: boolean }> {
  const [nearby, setNearby] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    if (typeof IntersectionObserver === "undefined") {
      setNearby(true);
      setVisible(true);
      recordSceneVisibility(sceneId, true);
      return () => recordSceneVisibility(sceneId, false);
    }

    const preloadObserver = new IntersectionObserver(
      ([entry]) => setNearby(entry?.isIntersecting === true),
      { rootMargin: "480px 0px" },
    );
    const visibleObserver = new IntersectionObserver(
      ([entry]) => {
        const nextVisible = entry?.isIntersecting === true;
        setVisible(nextVisible);
        recordSceneVisibility(sceneId, nextVisible);
      },
      { rootMargin: "0px", threshold: 0.01 },
    );
    recordSceneObserver(1);
    recordSceneObserver(1);
    preloadObserver.observe(host);
    visibleObserver.observe(host);
    return () => {
      preloadObserver.disconnect();
      visibleObserver.disconnect();
      recordSceneObserver(-1);
      recordSceneObserver(-1);
      recordSceneVisibility(sceneId, false);
    };
  }, [hostRef, sceneId]);

  return { nearby, visible };
}
