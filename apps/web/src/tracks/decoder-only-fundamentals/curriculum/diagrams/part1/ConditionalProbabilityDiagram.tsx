import type { ReactElement } from "react";

import { usePart1MobileLayout } from "./part1DiagramLayout";

const FIGURE_QUESTION = "Sequence 확률은 어떤 next-token 확률의 연쇄인가?";
const FACTORS = [
  ["w₁", "시작 조건", "P(w₁)"],
  ["w₂", "w₁이 주어짐", "P(w₂ | w₁)"],
  ["w₃", "w₁, w₂가 주어짐", "P(w₃ | w₁,w₂)"],
] as const;

export function ConditionalProbabilityDiagram(): ReactElement {
  const mobile = usePart1MobileLayout();
  const desktopX = [110, 390, 670] as const;
  const mobileY = [84, 234, 384] as const;

  return (
    <div className="part1-diagram" data-figure-question={FIGURE_QUESTION}>
      <svg
        viewBox={mobile ? "0 0 360 650" : "0 0 780 430"}
        role="img"
        aria-label="세 token sequence의 조건부 확률 연쇄"
        aria-describedby="conditional-desc"
        data-figure-layout={mobile ? "mobile" : "desktop"}
        data-figure-question={FIGURE_QUESTION}
      >
        <title>세 token sequence의 조건부 확률 연쇄</title>
        <desc id="conditional-desc">
          w1, w2, w3가 이어질 때 시작 확률과 점점 길어지는 prefix가 주어진
          next-token 확률 세 항을 곱해 sequence 확률을 구성하는 도식
        </desc>
        <defs>
          <marker
            id="conditional-arrow"
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
        <text className="part1-diagram__heading" x="30" y="38">
          앞선 token이 다음 조건이 됩니다
        </text>
        {FACTORS.map(([token, condition, probability], index) => {
          const x = mobile ? 64 : desktopX[index];
          const y = mobile ? mobileY[index] : 100;
          if (x === undefined || y === undefined) return null;
          const nextDesktopX = desktopX[index + 1] ?? x;
          const nextMobileY = mobileY[index + 1] ?? y;
          return (
            <g key={token} className="part1-diagram__factor">
              <circle cx={x} cy={y} r="34" />
              <text x={x} y={y + 7} textAnchor="middle">
                {token}
              </text>
              <text
                className="part1-diagram__note"
                x={mobile ? 124 : x}
                y={mobile ? y - 10 : y + 66}
                textAnchor={mobile ? "start" : "middle"}
              >
                {condition}
              </text>
              <text
                className="part1-diagram__probability"
                x={mobile ? 124 : x}
                y={mobile ? y + 22 : y + 94}
                textAnchor={mobile ? "start" : "middle"}
              >
                {probability}
              </text>
              {index < 2 && (
                <path
                  className="part1-diagram__path"
                  markerEnd="url(#conditional-arrow)"
                  d={
                    mobile
                      ? `M${x} ${y + 34}V${nextMobileY - 40}`
                      : `M${x + 34} ${y}H${nextDesktopX - 42}`
                  }
                />
              )}
            </g>
          );
        })}
        <path
          className="part1-diagram__equation-rule"
          d={mobile ? "M32 474H328" : "M50 242H730"}
        />
        <g className="part1-diagram__equation">
          <text
            x={mobile ? 30 : 390}
            y={mobile ? 520 : 290}
            textAnchor={mobile ? "start" : "middle"}
          >
            Sequence probability
          </text>
          <text
            className="part1-diagram__note"
            x={mobile ? 30 : 390}
            y={mobile ? 562 : 330}
            textAnchor={mobile ? "start" : "middle"}
          >
            P(w₁) × P(w₂ | w₁)
          </text>
          <text
            className="part1-diagram__note"
            x={mobile ? 30 : 390}
            y={mobile ? 598 : 362}
            textAnchor={mobile ? "start" : "middle"}
          >
            × P(w₃ | w₁,w₂)
          </text>
        </g>
      </svg>
      <div className="part1-diagram__fallback">
        <fieldset aria-label="조건부 확률 의미 설명">
          <ol>
            {FACTORS.map(([token, condition, probability]) => (
              <li key={token}>
                {token}: {condition}, {probability}
              </li>
            ))}
            <li>Sequence probability: 세 항의 곱</li>
          </ol>
        </fieldset>
      </div>
    </div>
  );
}
