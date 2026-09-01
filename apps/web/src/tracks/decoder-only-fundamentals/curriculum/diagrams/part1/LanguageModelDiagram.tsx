import type { ReactElement } from "react";

import { usePart1MobileLayout } from "./part1DiagramLayout";

const FIGURE_QUESTION = "언어 모델은 현재 context를 받아 무엇을 평가하는가?";
const CANDIDATES = ["m...", "f...", "..."] as const;

export function LanguageModelDiagram(): ReactElement {
  const mobile = usePart1MobileLayout();
  const context = mobile
    ? { x: 36, y: 44, width: 288, height: 96 }
    : { x: 28, y: 92, width: 248, height: 112 };
  const model = mobile
    ? { cx: 180, cy: 250, rx: 108, ry: 54 }
    : { cx: 370, cy: 148, rx: 82, ry: 54 };
  const candidates = mobile
    ? { x: 52, y: 370, width: 256 }
    : { x: 512, y: 84, width: 208 };

  return (
    <div className="part1-diagram" data-figure-question={FIGURE_QUESTION}>
      <svg
        viewBox={mobile ? "0 0 360 560" : "0 0 740 300"}
        role="img"
        aria-label="Context에서 다음 token 후보로 이어지는 언어 모델의 역할"
        aria-describedby="language-model-desc"
        data-figure-layout={mobile ? "mobile" : "desktop"}
        data-figure-question={FIGURE_QUESTION}
      >
        <title>Context에서 다음 token 후보로 이어지는 언어 모델의 역할</title>
        <desc id="language-model-desc">
          The cat sat on the context가 언어 모델을 거쳐 설명용 다음 token 후보
          m, f, 그 밖의 후보로 이어지는 관계
        </desc>
        <g className="part1-diagram__stage">
          <rect
            x={context.x}
            y={context.y}
            width={context.width}
            height={context.height}
            rx="6"
          />
          <text x={context.x + 18} y={context.y + 34}>
            현재 Context
          </text>
          <text
            className="part1-diagram__note"
            x={context.x + 18}
            y={context.y + 70}
          >
            The cat sat on the
          </text>
        </g>
        <path
          className="part1-diagram__path"
          d={
            mobile
              ? `M180 ${context.y + context.height}V${model.cy - model.ry}`
              : `M${context.x + context.width} 148H${model.cx - model.rx}`
          }
        />
        <g className="part1-diagram__model">
          <ellipse cx={model.cx} cy={model.cy} rx={model.rx} ry={model.ry} />
          <text x={model.cx} y={model.cy - 4} textAnchor="middle">
            Language Model
          </text>
          <text
            className="part1-diagram__note"
            x={model.cx}
            y={model.cy + 24}
            textAnchor="middle"
          >
            다음 위치 평가
          </text>
        </g>
        <path
          className="part1-diagram__path"
          d={
            mobile
              ? `M180 ${model.cy + model.ry}V${candidates.y - 34}`
              : `M${model.cx + model.rx} 148H${candidates.x}`
          }
        />
        <text
          className="part1-diagram__heading"
          x={candidates.x}
          y={candidates.y - 26}
        >
          다음 token 후보
        </text>
        {CANDIDATES.map((candidate, index) => (
          <g key={candidate} className="part1-diagram__candidate">
            <path
              className="part1-diagram__candidate-rule"
              d={`M${candidates.x} ${candidates.y + index * 54}H${candidates.x + candidates.width}`}
            />
            <text x={candidates.x + 12} y={candidates.y + 34 + index * 54}>
              {candidate}
            </text>
          </g>
        ))}
        <text
          className="part1-diagram__note"
          x={candidates.x}
          y={candidates.y + 170}
        >
          설명을 위한 예시 · 실제 출력 아님
        </text>
      </svg>
      <div className="part1-diagram__fallback">
        <fieldset aria-label="언어 모델이란? 의미 설명">
          <ol>
            <li>현재 context: The cat sat on the</li>
            <li>언어 모델: 다음 위치의 token 후보를 평가</li>
            <li>설명용 후보: m..., f..., 그 밖의 vocabulary token</li>
          </ol>
        </fieldset>
      </div>
    </div>
  );
}
