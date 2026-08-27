import {
  Canvas,
  type ThreeEvent,
  useFrame,
  useThree,
} from "@react-three/fiber";
import {
  type ReactElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Color, type InstancedMesh, Object3D } from "three";

import type { ScoreMatrixModel } from "../scoreMatrixModel";
import type { ThreeVisualizationRendererProps } from "../ThreeVisualizationSurface";
import {
  OrbitController,
  type ScoreMatrixCameraCommand,
  WebGLContextEvents,
} from "./ScoreMatrixControls";
import {
  buildScoreMatrixGeometry,
  type ScoreMatrixCellKey,
} from "./scoreMatrixGeometry";
import "./scoreMatrix.css";

export {
  OrbitController,
  type ScoreMatrixCameraCommand,
  WebGLContextEvents,
} from "./ScoreMatrixControls";

export type ScoreMatrixSceneProps = ThreeVisualizationRendererProps<{
  model: ScoreMatrixModel;
  selectedCellKey: ScoreMatrixCellKey | null;
  onSelect: (cellKey: ScoreMatrixCellKey) => void;
  cameraCommand: ScoreMatrixCameraCommand | null;
}>;

type ScoreGridProps = Readonly<{
  model: ScoreMatrixModel;
  selectedCellKey: ScoreMatrixCellKey | null;
  onSelect: (cellKey: ScoreMatrixCellKey) => void;
}>;

export function RenderReadySignal(): null {
  const { gl } = useThree();
  const signaled = useRef(false);

  useFrame(() => {
    const renderCount =
      Number(gl.domElement.getAttribute("data-render-count") ?? "0") + 1;
    gl.domElement.setAttribute("data-render-count", String(renderCount));
    if (signaled.current) return;
    signaled.current = true;
    gl.domElement.setAttribute("data-render-state", "ready");
  });

  useEffect(
    () => () => {
      gl.domElement.removeAttribute("data-render-state");
      gl.domElement.removeAttribute("data-render-count");
    },
    [gl.domElement],
  );
  return null;
}

function ScoreGrid({
  model,
  selectedCellKey,
  onSelect,
}: ScoreGridProps): ReactElement {
  const [hoveredCellKey, setHoveredCellKey] =
    useState<ScoreMatrixCellKey | null>(null);
  const activeCellKey = hoveredCellKey ?? selectedCellKey;
  const geometry = useMemo(
    () => buildScoreMatrixGeometry(model, activeCellKey),
    [activeCellKey, model],
  );
  const meshRef = useRef<InstancedMesh>(null);
  const transform = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (mesh === null) return;
    for (const cell of geometry.cells) {
      transform.position.set(cell.x, cell.centerY + cell.selectionLift, cell.z);
      transform.scale.set(cell.scaleXZ, cell.displayHeight, cell.scaleXZ);
      transform.updateMatrix();
      mesh.setMatrixAt(cell.instanceIndex, transform.matrix);
      mesh.setColorAt(cell.instanceIndex, color.set(cell.color));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
  }, [color, geometry.cells, transform]);

  const cellAtEvent = (
    event: ThreeEvent<MouseEvent>,
  ): (typeof geometry.cells)[number] | undefined =>
    event.instanceId === undefined
      ? undefined
      : geometry.cells[event.instanceId];

  const interactionHandlers = {
    onPointerMove(event: ThreeEvent<PointerEvent>): void {
      event.stopPropagation();
      const cell = cellAtEvent(event);
      if (cell !== undefined) setHoveredCellKey(cell.key);
    },
    onPointerOut(): void {
      setHoveredCellKey(null);
    },
    onClick(event: ThreeEvent<MouseEvent>): void {
      event.stopPropagation();
      const cell = cellAtEvent(event);
      if (cell !== undefined) onSelect(cell.key);
    },
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, geometry.cells.length]}
      {...interactionHandlers}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.62} metalness={0.04} />
    </instancedMesh>
  );
}

export default function ScoreMatrixScene({
  model,
  selectedCellKey,
  onSelect,
  cameraCommand,
  onContextLost,
  onContextRestored,
  reducedMotion,
}: ScoreMatrixSceneProps): ReactElement {
  const geometry = useMemo(
    () => buildScoreMatrixGeometry(model, selectedCellKey),
    [model, selectedCellKey],
  );
  const gridSize = Math.max(model.size + 2, 4);

  return (
    <div className="score-matrix-scene">
      <section
        className="score-matrix-canvas"
        aria-label={`Layer ${model.layer}, Head ${model.head} score matrix 3D view`}
      >
        <Canvas
          aria-hidden="true"
          frameloop="demand"
          dpr={[1, 2]}
          camera={{
            position: [7.5, 9, 10.5],
            fov: 44,
            near: 0.1,
            far: 100,
          }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
        >
          <color attach="background" args={[0xfbfaf6]} />
          <ambientLight intensity={1.2} />
          <directionalLight position={[5, 8, 5]} intensity={2.2} />
          <RenderReadySignal />
          <gridHelper
            args={[gridSize, gridSize, 0x8b8374, 0xd3ccbd]}
            position={[0, 0, 0]}
          />
          <ScoreGrid
            model={model}
            selectedCellKey={selectedCellKey}
            onSelect={onSelect}
          />
          <OrbitController
            reducedMotion={reducedMotion}
            cameraCommand={cameraCommand}
          />
          <WebGLContextEvents
            onContextLost={onContextLost}
            onContextRestored={onContextRestored}
          />
        </Canvas>
      </section>
      <ul className="score-matrix-legend" aria-label="점수 범례">
        {geometry.legend.map((entry) => (
          <li key={entry.tone}>
            <span
              className="score-matrix-legend-swatch"
              data-tone={entry.tone}
              aria-hidden="true"
            />
            <span>
              {entry.tone}: {entry.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
