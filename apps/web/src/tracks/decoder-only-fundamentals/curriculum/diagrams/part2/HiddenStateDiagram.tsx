import type { ReactElement } from "react";

const STATES = ["X_0", "X_1", "X_N"] as const;

export function HiddenStateDiagram(): ReactElement {
  return (
    <div className="part2-diagram">
      <svg
        viewBox="0 0 760 470"
        role="img"
        aria-label="Causal prefix를 반영하는 hidden state 흐름"
        aria-describedby="hidden-state-desc"
      >
        <title>Causal prefix를 반영하는 hidden state 흐름</title>
        <desc id="hidden-state-desc">
          B가 하나일 때 T by C로 적은 hidden state가 Transformer Blocks 사이에서
          shape를 유지하고 각 token 위치는 현재까지의 causal prefix만 반영하는
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
            <g key={state} className="part2-diagram__state">
              <text x={x + 82} y="82" textAnchor="middle">
                {state}
              </text>
              {[0, 1, 2].map((position) => (
                <g key={position} className="part2-diagram__state-row">
                  <rect
                    x={x}
                    y={102 + position * 64}
                    width="164"
                    height="44"
                    rx="7"
                  />
                  <text x={x + 14} y={129 + position * 64}>
                    t{position}
                  </text>
                  {[0, 1, 2, 3].map((channel) => (
                    <circle
                      key={channel}
                      cx={x + 70 + channel * 24}
                      cy={124 + position * 64}
                      r="5"
                    />
                  ))}
                </g>
              ))}
              <text
                className="part2-diagram__axis"
                x={x + 82}
                y="322"
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
          d="M198 196H258"
        />
        <text
          className="part2-diagram__operator"
          x="228"
          y="180"
          textAnchor="middle"
        >
          Block 1
        </text>
        <path
          className="part2-diagram__path"
          markerEnd="url(#hidden-arrow)"
          d="M448 196H508"
        />
        <text
          className="part2-diagram__operator"
          x="478"
          y="180"
          textAnchor="middle"
        >
          … Blocks
        </text>
        <g className="part2-diagram__prefixes">
          <text className="part2-diagram__heading" x="28" y="378">
            Causal prefix
          </text>
          <text x="172" y="378">
            t0 ← token 0
          </text>
          <text x="330" y="378">
            t1 ← tokens 0…1
          </text>
          <text x="520" y="378">
            t2 ← tokens 0…2
          </text>
          <path className="part2-diagram__brace" d="M28 400H698" />
          <text
            className="part2-diagram__note"
            x="363"
            y="438"
            textAnchor="middle"
          >
            미래 위치는 제외 · shape 유지 · 값은 문맥에 따라 갱신
          </text>
        </g>
      </svg>
      <div className="part2-diagram__fallback">
        <fieldset aria-label="Hidden State 의미 설명">
          <ol>
            <li>Actual Block boundary: [B,T,C]</li>
            <li>Batch-one notation: [T,C]</li>
            <li>States: X_0 → X_1 → X_N, shape preserved</li>
            <li>Each position reflects only its causal prefix</li>
          </ol>
        </fieldset>
      </div>
    </div>
  );
}
