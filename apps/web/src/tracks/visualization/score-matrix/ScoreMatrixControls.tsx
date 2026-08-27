import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export type ScoreMatrixCameraCommand =
  | Readonly<{
      id: number;
      kind: "rotate";
      horizontal: number;
      vertical: number;
    }>
  | Readonly<{
      id: number;
      kind: "pan";
      horizontal: number;
      vertical: number;
    }>
  | Readonly<{ id: number; kind: "zoom"; direction: "in" | "out" }>
  | Readonly<{ id: number; kind: "reset" }>;

type OrbitControllerProps = Readonly<{
  reducedMotion: boolean;
  cameraCommand: ScoreMatrixCameraCommand | null;
}>;

type WebGLContextEventsProps = Readonly<{
  onContextLost: () => void;
  onContextRestored: () => void;
}>;

function assertNever(value: never): never {
  throw new TypeError(`Unsupported camera command: ${String(value)}`);
}

export function OrbitController({
  reducedMotion,
  cameraCommand,
}: OrbitControllerProps): null {
  const { camera, gl, invalidate } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const lastAppliedCommandIdRef = useRef<number | null>(null);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    const handleChange = (): void => invalidate();
    controls.minAzimuthAngle = -Math.PI / 4;
    controls.maxAzimuthAngle = Math.PI / 4;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 4;
    controls.maxDistance = 18;
    controls.enableDamping = false;
    controls.autoRotate = false;
    controls.enabled = true;
    controls.rotateSpeed = reducedMotion ? 0.65 : 1;
    controls.zoomSpeed = reducedMotion ? 0.65 : 1;
    controls.panSpeed = reducedMotion ? 0.65 : 1;
    controls.target.set(0, 0, 0);
    controls.update();
    controls.saveState();
    controls.addEventListener("change", handleChange);
    controlsRef.current = controls;
    invalidate();

    return () => {
      controls.removeEventListener("change", handleChange);
      controls.dispose();
      if (controlsRef.current === controls) controlsRef.current = null;
    };
  }, [camera, gl.domElement, invalidate, reducedMotion]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (
      controls === null ||
      cameraCommand === null ||
      cameraCommand.id === lastAppliedCommandIdRef.current
    )
      return;
    lastAppliedCommandIdRef.current = cameraCommand.id;

    switch (cameraCommand.kind) {
      case "rotate":
        controls.rotateLeft((Math.PI / 12) * cameraCommand.horizontal);
        controls.rotateUp((Math.PI / 12) * cameraCommand.vertical);
        break;
      case "pan":
        controls.pan(
          24 * cameraCommand.horizontal,
          24 * cameraCommand.vertical,
        );
        break;
      case "zoom":
        if (cameraCommand.direction === "in") controls.dollyIn(1.15);
        else controls.dollyOut(1.15);
        break;
      case "reset":
        controls.reset();
        break;
      default:
        assertNever(cameraCommand);
    }
    controls.update();
    invalidate();
  }, [cameraCommand, invalidate]);

  return null;
}

export function WebGLContextEvents({
  onContextLost,
  onContextRestored,
}: WebGLContextEventsProps): null {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const handleContextLost = (event: Event): void => {
      event.preventDefault();
      onContextLost();
    };
    const handleContextRestored = (): void => onContextRestored();
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, [gl.domElement, onContextLost, onContextRestored]);

  return null;
}
