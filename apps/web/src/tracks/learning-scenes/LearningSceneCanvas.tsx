import { Canvas, useThree } from "@react-three/fiber";
import { type ReactElement, type ReactNode, useEffect } from "react";

import type { LearningSceneViewport } from "./sceneTypes";

type SceneCamera = Readonly<{
  far?: number;
  fov: number;
  near?: number;
  position: readonly [number, number, number];
}>;

type LearningSceneCanvasProps = Readonly<{
  camera: SceneCamera;
  children: ReactNode;
  onContextCreated: () => void;
  onContextDisposed: () => void;
  onContextLost: () => void;
  onContextRestored: () => void;
  sceneId: string;
  viewport: LearningSceneViewport;
}>;

const GL_OPTIONS = {
  alpha: true,
  antialias: true,
  powerPreference: "high-performance",
  preserveDrawingBuffer: false,
} as const;

function SceneLifecycle({
  onContextCreated,
  onContextDisposed,
  onContextLost,
  onContextRestored,
  sceneId,
}: Omit<LearningSceneCanvasProps, "camera" | "children" | "viewport">): null {
  const { gl, invalidate } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const loseContext = (event: Event) => {
      event.preventDefault();
      onContextLost();
    };
    const restoreContext = () => {
      onContextRestored();
      invalidate();
    };
    canvas.dataset["learningSceneCanvas"] = sceneId;
    canvas.addEventListener("webglcontextlost", loseContext);
    canvas.addEventListener("webglcontextrestored", restoreContext);
    onContextCreated();
    invalidate();
    return () => {
      canvas.removeEventListener("webglcontextlost", loseContext);
      canvas.removeEventListener("webglcontextrestored", restoreContext);
      delete canvas.dataset["learningSceneCanvas"];
      onContextDisposed();
    };
  }, [
    gl,
    invalidate,
    onContextCreated,
    onContextDisposed,
    onContextLost,
    onContextRestored,
    sceneId,
  ]);

  return null;
}

export function LearningSceneCanvas({
  camera,
  children,
  onContextCreated,
  onContextDisposed,
  onContextLost,
  onContextRestored,
  sceneId,
  viewport,
}: LearningSceneCanvasProps): ReactElement {
  return (
    <Canvas
      key={viewport}
      aria-hidden="true"
      camera={{
        far: camera.far ?? 100,
        fov: camera.fov,
        near: camera.near ?? 0.1,
        position: [...camera.position],
      }}
      dpr={[1, 1.5]}
      eventSource={document.body}
      frameloop="demand"
      gl={GL_OPTIONS}
      shadows={false}
    >
      <hemisphereLight args={["#ffffff", "#526560", 1.7]} />
      <ambientLight color="#dce7e3" intensity={0.7} />
      <directionalLight color="#ffffff" intensity={2.4} position={[5, 8, 9]} />
      <SceneLifecycle
        onContextCreated={onContextCreated}
        onContextDisposed={onContextDisposed}
        onContextLost={onContextLost}
        onContextRestored={onContextRestored}
        sceneId={sceneId}
      />
      {children}
    </Canvas>
  );
}
