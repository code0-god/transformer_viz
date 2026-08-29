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
  const selectedCell = geometry.cells.find(
    (cell) => cell.key === selectedCellKey,
  );

  return (
    <div className="score-matrix-scene">
      <section
        className="score-matrix-canvas"
        aria-label={`Layer ${model.layer}, Head ${model.head} score matrix 3D view`}
      >
        <div className="score-matrix-canvas-axes" aria-hidden="true">
          <span data-axis="key">
            Key axis · k0 {JSON.stringify(model.keyTokenLabels[0] ?? "")} · k
            {model.keyTokenLabels.length - 1}{" "}
            {JSON.stringify(model.keyTokenLabels.at(-1) ?? "")}
          </span>
          <span data-axis="query">
            Query axis · q0 {JSON.stringify(model.queryTokenLabels[0] ?? "")} ·
            q{model.queryTokenLabels.length - 1}{" "}
            {JSON.stringify(model.queryTokenLabels.at(-1) ?? "")}
          </span>
          <span data-plane="zero">0 plane</span>
        </div>
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
          <color attach="background" args={[0x11181b]} />
          <ambientLight intensity={1.45} />
          <directionalLight position={[5, 8, 5]} intensity={2.45} />
          <RenderReadySignal />
          <mesh
            name="score-matrix-zero-plane"
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.015, 0]}
            raycast={() => undefined}
          >
            <planeGeometry args={[gridSize, gridSize]} />
            <meshBasicMaterial
              color={0x91a1a4}
              transparent
              opacity={0.12}
              depthWrite={false}
            />
          </mesh>
          <gridHelper
            args={[gridSize, gridSize, 0x8b999c, 0x354347]}
            position={[0, 0, 0]}
          />
          <ScoreGrid
            model={model}
            selectedCellKey={selectedCellKey}
            onSelect={onSelect}
          />
          {selectedCell === undefined ? null : (
            <mesh
              name="score-matrix-selected-cell-rim"
              position={[
                selectedCell.x,
                selectedCell.centerY + selectedCell.selectionLift,
                selectedCell.z,
              ]}
              scale={[
                selectedCell.scaleXZ + 0.1,
                selectedCell.displayHeight + 0.08,
                selectedCell.scaleXZ + 0.1,
              ]}
              raycast={() => undefined}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial
                color={0xb9f5e8}
                wireframe
                transparent
                opacity={0.95}
              />
            </mesh>
          )}
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
      <p className="score-matrix-orientation">
        Key 가로축 · Query 깊이축 · 0 plane 기준 signed height
      </p>
      <div className="score-matrix-legend-panel">
        <span className="score-matrix-legend-scale" aria-hidden="true" />
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
    </div>
  );
}
