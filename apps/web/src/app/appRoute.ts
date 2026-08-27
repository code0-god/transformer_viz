import { useSyncExternalStore } from "react";

import {
  type LearningTrackRegistry,
  learningTrackRegistry,
} from "../tracks/registry";
import type { LearningTrackId } from "../tracks/types";

export type AppRoute =
  | { readonly view: "home" }
  | { readonly view: "lab" }
  | {
      readonly view: "chapter";
      readonly trackId: LearningTrackId;
      readonly chapterId: string;
    };

function routeSegments(hash: string): readonly string[] {
  const route = hash.startsWith("#") ? hash.slice(1) : hash;
  return route.split("/").filter((segment) => segment.length > 0);
}

export function resolveAppRoute(
  hash: string,
  _registry: LearningTrackRegistry = learningTrackRegistry,
): AppRoute {
  const segments = routeSegments(hash);
  if (segments.length === 0) return { view: "home" };
  if (segments.length === 1 && segments[0] === "lab") return { view: "lab" };
  return { view: "home" };
}

function resolveLearningRoute(
  hash: string,
  registry: LearningTrackRegistry,
): AppRoute {
  const segments = routeSegments(hash);
  if (
    segments.length !== 3 ||
    segments[0] !== "learn" ||
    segments[1] === undefined ||
    segments[2] === undefined
  ) {
    return resolveAppRoute(hash, registry);
  }
  const registration = registry.registrations.find(
    ({ profile }) => profile.id === segments[1],
  );
  const chapter = registration?.course?.chapters.find(
    ({ slug }) => slug === segments[2],
  );
  return registration === undefined || chapter === undefined
    ? { view: "home" }
    : {
        view: "chapter",
        trackId: registration.profile.id,
        chapterId: chapter.id,
      };
}

export function appRoute(
  hash: string,
  registry: LearningTrackRegistry = learningTrackRegistry,
): AppRoute {
  return hash.startsWith("#/learn/")
    ? resolveLearningRoute(hash, registry)
    : resolveAppRoute(hash, registry);
}

export function chapterHref(
  trackId: LearningTrackId,
  chapterId: string,
  registry: LearningTrackRegistry = learningTrackRegistry,
): string {
  const registration = registry.byTrackId.get(trackId);
  const chapter = registration?.course?.chapters.find(
    ({ id }) => id === chapterId,
  );
  return chapter === undefined ? "#/" : `#/learn/${trackId}/${chapter.slug}`;
}

function subscribeToHash(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function useAppRoute(
  registry: LearningTrackRegistry = learningTrackRegistry,
): AppRoute {
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => "",
  );
  return appRoute(hash, registry);
}
