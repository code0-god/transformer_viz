import type { ReactElement } from "react";

import { usePart1MobileLayout } from "./part1DiagramLayout";

const FIGURE_QUESTION = "선택한 token은 어떻게 다음 예측을 시작하는가?";

export function AutoregressiveLoopDiagram(): ReactElement {
  const mobile = usePart1MobileLayout();
  const center = mobile ? 180 : 380;
  const context = mobile
    ? { x: 32, y: 42, width: 296, height: 84 }
    : { x: 30, y: 120, width: 220, height: 92 };
  const model = mobile
    ? { cx: 180, cy: 232, rx: 104, ry: 48 }
    : { cx: 380, cy: 166, rx: 92, ry: 54 };
  const generated = mobile ? { cx: 180, cy: 350 } : { cx: 585, cy: 166 };
  const updated = mobile
    ? { x: 32, y: 442, width: 296, height: 84 }
    : { x: 470, y: 294, width: 260, height: 92 };

  return (
    <div className="part1-diagram" data-figure-question={FIGURE_QUESTION}>
      <svg
        viewBox={mobile ? "0 0 360 640" : "0 0 760 430"}
        role="img"
        aria-label="생성한 token을 context에 추가하는 반복 과정"
        aria-describedby="autoregressive-desc"
        data-figure-layout={mobile ? "mobile" : "desktop"}
        data-figure-question={FIGURE_QUESTION}
      >
        <title>생성한 token을 context에 추가하는 반복 과정</title>
        <desc id="autoregressive-desc">
          현재 context에서 다음 token 하나를 생성하고, 그 token을 context에
          추가한 뒤, 업데이트된 context로 같은 next-token prediction을 반복하는
          흐름
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
        <text className="part1-diagram__heading" x="30" y="30">
          한 token씩 길어지는 context
        </text>
        <g className="part1-diagram__context">
          <rect
            x={context.x}
            y={context.y}
            width={context.width}
            height={context.height}
            rx="6"
          />
          <text x={context.x + 18} y={context.y + 30}>
            Current Context
          </text>
          <text
            className="part1-diagram__note"
            x={context.x + 18}
            y={context.y + 60}
          >
            The cat
          </text>
        </g>
        <path
          className="part1-diagram__path"
          markerEnd="url(#loop-arrow)"
          d={
            mobile
              ? `M${center} ${context.y + context.height}V${model.cy - model.ry}`
              : `M${context.x + context.width} 166H${model.cx - model.rx}`
          }
        />
        <text
          className="part1-diagram__loop-label"
          x={mobile ? center + 12 : 264}
          y={mobile ? 164 : 132}
        >
          Predict
        </text>
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
            one-step prediction
          </text>
        </g>
        <path
          className="part1-diagram__path"
          markerEnd="url(#loop-arrow)"
          d={
            mobile
              ? `M${center} ${model.cy + model.ry}V${generated.cy - 32}`
              : `M${model.cx + model.rx} 166H${generated.cx - 32}`
          }
        />
        <g className="part1-diagram__generated">
          <circle cx={generated.cx} cy={generated.cy} r="32" />
          <text x={generated.cx} y={generated.cy + 7} textAnchor="middle">
            s
          </text>
          <text
            className="part1-diagram__note"
            x={mobile ? 82 : generated.cx}
            y={generated.cy + 60}
            textAnchor="middle"
          >
            {mobile ? "새 token" : "Generated Token"}
          </text>
        </g>
        <path
          className="part1-diagram__path"
          markerEnd="url(#loop-arrow)"
          d={
            mobile
              ? `M${center} ${generated.cy + 68}V${updated.y}`
              : `M${generated.cx} ${generated.cy + 32}V${updated.y - 24}H${updated.x + updated.width / 2}V${updated.y}`
          }
        />
        <text
          className="part1-diagram__loop-label"
          x={mobile ? 250 : updated.x + 30}
          y={mobile ? updated.y - 20 : updated.y - 30}
        >
          Append
        </text>
        <g className="part1-diagram__context part1-diagram__context--updated">
          <rect
            x={updated.x}
            y={updated.y}
            width={updated.width}
            height={updated.height}
            rx="6"
          />
          <text x={updated.x + 18} y={updated.y + 30}>
            Updated Context
          </text>
          <text
            className="part1-diagram__note"
            x={updated.x + 18}
            y={updated.y + 60}
          >
            The cats
          </text>
        </g>
        <path
          className="part1-diagram__path part1-diagram__path--loop"
          markerEnd="url(#loop-arrow)"
          d={
            mobile
              ? `M${updated.x + updated.width} ${updated.y + 42}H344V${model.cy}H${model.cx + model.rx}`
              : `M${updated.x} ${updated.y + 46}H380V${model.cy + model.ry}`
          }
        />
        <text
          className="part1-diagram__loop-label"
          x={mobile ? 304 : 396}
          y={mobile ? updated.y + 114 : updated.y + 36}
        >
          Repeat
        </text>
      </svg>
      <div className="part1-diagram__fallback">
        <fieldset aria-label="Autoregressive Generation 의미 설명">
          <ol>
            <li>Current Context: The cat</li>
            <li>Predict: 언어 모델이 다음 token 하나를 평가</li>
            <li>Generated Token: s</li>
            <li>Append: Updated Context는 The cats</li>
            <li>Repeat: 업데이트된 context로 다시 예측</li>
          </ol>
        </fieldset>
      </div>
    </div>
  );
}
