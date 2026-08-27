import type { ReactElement } from "react";

const LOOP = [
  ["Predict", "Model · full prefix forward"],
  ["Select", "Sampler · config 적용"],
  ["Append", "Selected token → context"],
  ["Repeat", "종료 전 다음 step"],
] as const;

export function AutoregressiveLoopDiagram(): ReactElement {
  return (
    <figure className="part1-diagram">
      <svg
        viewBox="0 0 760 470"
        role="img"
        aria-label="Autoregressive predict append repeat loop"
        aria-describedby="autoregressive-desc"
      >
        <title>Autoregressive predict append repeat loop</title>
        <desc id="autoregressive-desc">
          Full prefix를 predict하고 sampler가 token을 선택한 뒤 context에
          append하여 반복하는 현재 generation 흐름. Persistent generation KV
          cache는 없음
        </desc>
        <defs>
          <marker
            id="loop-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0 0 10 5 0 10Z" />
          </marker>
        </defs>
        <text className="part1-diagram__heading" x="32" y="38">
          Context grows one selected token at a time
        </text>
        <path
          className="part1-diagram__path part1-diagram__path--loop"
          markerEnd="url(#loop-arrow)"
          d="M244 126H500Q632 126 632 246Q632 366 500 366H244Q112 366 112 246Q112 126 244 126"
        />
        {LOOP.map(([title, note], index) => {
          const points = [
            [150, 76],
            [454, 76],
            [454, 316],
            [150, 316],
          ] as const;
          const point = points[index];
          if (point === undefined) return null;
          return (
            <g key={title} className="part1-diagram__stage">
              <rect x={point[0]} y={point[1]} width="156" height="92" rx="14" />
              <text x={point[0] + 78} y={point[1] + 38} textAnchor="middle">
                {title}
              </text>
              <text
                className="part1-diagram__note"
                x={point[0] + 78}
                y={point[1] + 65}
                textAnchor="middle"
              >
                {note}
              </text>
            </g>
          );
        })}
        <g className="part1-diagram__product">
          <rect x="266" y="208" width="228" height="76" rx="12" />
          <text x="380" y="238" textAnchor="middle">
            Current runtime
          </text>
          <text
            className="part1-diagram__note"
            x="380"
            y="263"
            textAnchor="middle"
          >
            No persistent generation KV cache
          </text>
        </g>
      </svg>
      <figcaption className="part1-diagram__fallback">
        <fieldset aria-label="Autoregressive Generation 의미 설명">
          <ol>
            {LOOP.map(([title, note]) => (
              <li key={title}>
                <strong>{title}</strong>: {note}
              </li>
            ))}
            <li>
              Current runtime: full accumulated prefix re-forward, no persistent
              generation KV cache
            </li>
          </ol>
        </fieldset>
      </figcaption>
    </figure>
  );
}
