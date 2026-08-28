import type { ReactElement } from "react";

const ROWS = [
  { token: "the", position: "0", y: 88 },
  { token: "cat", position: "1", y: 238 },
] as const;

export function PositionEmbeddingDiagram(): ReactElement {
  return (
    <div className="part2-diagram">
      <svg
        viewBox="0 0 760 460"
        role="img"
        aria-label="Token과 learned absolute position embedding의 합"
        aria-describedby="position-embedding-desc"
      >
        <title>Token과 learned absolute position embedding의 합</title>
        <desc id="position-embedding-desc">
          각 token embedding과 같은 위치의 learned absolute position embedding을
          원소별로 더해 X_0를 만드는 symbolic composition
        </desc>
        <defs>
          <marker
            id="position-arrow"
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
          Token row · [C]
        </text>
        <text className="part2-diagram__heading" x="272" y="38">
          Position row · [C]
        </text>
        <text className="part2-diagram__heading" x="590" y="38">
          X_0 row · [C]
        </text>
        {ROWS.map(({ token, position, y }) => (
          <g key={position}>
            <g className="part2-diagram__vector">
              <rect x="28" y={y} width="164" height="62" rx="9" />
              <text x="110" y={y + 27} textAnchor="middle">
                {token}
              </text>
              <text
                className="part2-diagram__symbol"
                x="110"
                y={y + 47}
                textAnchor="middle"
              >
                E_tok[{token}]
              </text>
            </g>
            <text
              className="part2-diagram__operator"
              x="230"
              y={y + 40}
              textAnchor="middle"
            >
              +
            </text>
            <g className="part2-diagram__position">
              <rect x="272" y={y} width="188" height="62" rx="9" />
              <text x="366" y={y + 27} textAnchor="middle">
                absolute position {position}
              </text>
              <text
                className="part2-diagram__symbol"
                x="366"
                y={y + 47}
                textAnchor="middle"
              >
                E_pos[{position}]
              </text>
            </g>
            <path
              className="part2-diagram__path"
              markerEnd="url(#position-arrow)"
              d={`M470 ${y + 31}H566`}
            />
            <g className="part2-diagram__sum">
              <rect x="578" y={y} width="154" height="62" rx="9" />
              <text x="655" y={y + 27} textAnchor="middle">
                position {position}
              </text>
              <text
                className="part2-diagram__symbol"
                x="655"
                y={y + 47}
                textAnchor="middle"
              >
                X_0[{position}]
              </text>
            </g>
          </g>
        ))}
        <path className="part2-diagram__brace" d="M28 360V392H732V360" />
        <text
          className="part2-diagram__note"
          x="380"
          y="424"
          textAnchor="middle"
        >
          결합은 concatenation이 아니라 element-wise addition · [T,C] 유지
        </text>
      </svg>
      <div className="part2-diagram__fallback">
        <fieldset aria-label="Position Embedding 의미 설명">
          <ol>
            <li>Token rows: E_tok [T,C]</li>
            <li>Learned absolute position rows: E_pos [T,C]</li>
            <li>Operation: element-wise addition</li>
            <li>Result: X_0 [T,C]</li>
          </ol>
        </fieldset>
      </div>
    </div>
  );
}
