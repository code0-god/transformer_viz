import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

type DemandTransitionOptions = Readonly<{
  apply: (progress: number) => void;
  duration?: number;
  onFrame: () => void;
  reducedMotion: boolean;
  transitionKey: string | number;
}>;

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

export function useDemandTransition({
  apply,
  duration = 0.55,
  onFrame,
  reducedMotion,
  transitionKey,
}: DemandTransitionOptions): void {
  const { invalidate } = useThree();
  const progress = useRef(1);

  useEffect(() => {
    void transitionKey;
    progress.current = reducedMotion ? 1 : 0;
    apply(progress.current);
    invalidate();
  }, [apply, invalidate, reducedMotion, transitionKey]);

  useFrame((_state, delta) => {
    if (progress.current >= 1) return;
    progress.current = Math.min(1, progress.current + delta / duration);
    apply(easeOutCubic(progress.current));
    onFrame();
    if (progress.current < 1) invalidate();
  });
}
