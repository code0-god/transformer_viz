import type { ReactElement } from "react";

const STATES = [
  {
    label: "X_0",
    values: [
      [0.2, 0.7, 0.4, 0.8],
      [0.6, 0.3, 0.9, 0.4],
    ],
  },
  {
    label: "X_1",
    values: [
      [0.7, 0.4, 0.8, 0.3],
      [0.3, 0.9, 0.5, 0.7],
    ],
  },
  {
    label: "X_N",
    values: [
      [0.4, 0.9, 0.3, 0.7],
      [0.8, 0.5, 0.7, 0.2],
    ],
  },
] as const;

const CHANNEL_IDS = ["c0", "c1", "c2", "c3"] as const;

export function HiddenStateDiagram(): ReactElement {
  return (
    <div className="part2-diagram">
      <svg
        viewBox="0 0 760 410"
        role="img"
        aria-label="Shape를 유지하며 값이 바뀌는 hidden state 흐름"
        aria-describedby="hidden-state-desc"
      >
        <title>Shape를 유지하며 값이 바뀌는 hidden state 흐름</title>
        <desc id="hidden-state-desc">
          B가 하나일 때 T by C로 적은 X_0, X_1, X_N hidden state가 같은 token
          row와 tensor shape를 유지하면서 illustrative activation 값을 바꾸는
          symbolic 흐름
        </desc>
        <defs>
          <marker
            id="hidden-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <path d="M0 0L8 4L0 8Z" />
          </marker>
        </defs>
        <text className="part2-diagram__heading" x="28" y="38">
          Block boundary · 실제 [B,T,C] · B=1 표기 [T,C]
        </text>
        {STATES.map((state, stateIndex) => {
          const x = 28 + stateIndex * 250;
          return (
            <g key={state.label} className="part2-diagram__state">
              <text x={x + 82} y="82" textAnchor="middle">
                {state.label}
              </text>
              {state.values.map((row, position) => (
                <g
                  key={position === 0 ? "the" : "cat"}
                  className="part2-diagram__state-row"
                >
                  <rect
                    x={x}
                    y={108 + position * 78}
                    width="164"
                    height="54"
                    rx="7"
                  />
                  <text x={x + 12} y={139 + position * 78}>
                    t{position} · {position === 0 ? "the" : "cat"}
                  </text>
                  {CHANNEL_IDS.map((channelId, channel) => (
                    <circle
                      key={channelId}
                      cx={x + 70 + channel * 24}
                      cy={135 + position * 78}
                      r={3 + (row[channel] ?? 0) * 4}
                    />
                  ))}
                </g>
              ))}
              <text
                className="part2-diagram__axis"
                x={x + 82}
                y="292"
                textAnchor="middle"
              >
                T positions · C channels
              </text>
            </g>
          );
        })}
        <path
          className="part2-diagram__path"
          markerEnd="url(#hidden-arrow)"
          d="M198 171H258"
        />
        <text
          className="part2-diagram__operator"
          x="228"
          y="154"
          textAnchor="middle"
        >
          Block 1
        </text>
        <path
          className="part2-diagram__path"
          markerEnd="url(#hidden-arrow)"
          d="M448 171H508"
        />
        <text
          className="part2-diagram__operator"
          x="478"
          y="154"
          textAnchor="middle"
        >
          … Blocks
        </text>
        <path className="part2-diagram__brace" d="M28 326V346H698V326" />
        <text
          className="part2-diagram__note"
          x="363"
          y="382"
          textAnchor="middle"
        >
          같은 token rows · [T,C] 유지 · illustrative activations 변화
        </text>
      </svg>
      <div className="part2-diagram__fallback">
        <fieldset aria-label="Hidden State 의미 설명">
          <ol>
            <li>Actual Block boundary: [B,T,C]</li>
            <li>Batch-one notation: [T,C]</li>
            <li>States: X_0 → X_1 → X_N</li>
            <li>Same token rows and [T,C] geometry</li>
            <li>Illustrative activations change between states</li>
          </ol>
        </fieldset>
      </div>
    </div>
  );
}
