import type { ReactElement } from "react";

import { usePart1MobileLayout } from "./part1DiagramLayout";

const FIGURE_QUESTION = "한 context는 어떻게 다음 token 하나로 이어지는가?";
const STAGE_ORDER =
  "context vocabulary-logits selection-distribution sampler next-token";
const LOGIT_ROWS = [
  ["token A", 1],
  ["token B", 0.68],
  ["token C", 0.34],
] as const;

export function NextTokenPredictionDiagram(): ReactElement {
  const mobile = usePart1MobileLayout();
  const x = mobile ? 28 : 90;
  const width = mobile ? 304 : 540;
  const center = mobile ? 180 : 360;
  const contextY = mobile ? 38 : 34;
  const logitsY = mobile ? 170 : 150;
  const distributionY = mobile ? 410 : 342;
  const samplerY = mobile ? 555 : 445;
  const nextY = mobile ? 650 : 510;

  return (
    <div className="part1-diagram" data-figure-question={FIGURE_QUESTION}>
      <svg
        viewBox={mobile ? "0 0 360 730" : "0 0 720 590"}
        role="img"
        aria-label="Vocabulary logit에서 다음 token 선택까지의 한 단계"
        aria-describedby="next-token-desc"
        data-figure-layout={mobile ? "mobile" : "desktop"}
        data-figure-question={FIGURE_QUESTION}
        data-stage-order={STAGE_ORDER}
      >
        <title>Vocabulary logit에서 다음 token 선택까지의 한 단계</title>
        <desc id="next-token-desc">
          현재 context에서 vocabulary 전체의 raw logit을 만들고, Temperature와
          Top-K, Softmax로 선택 분포를 구성한 뒤 sampler가 다음 token 하나를
          고르는 과정
        </desc>
        <defs>
          <marker
            id="next-token-arrow"
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
        <g className="part1-diagram__stage" data-stage="context">
          <rect x={x} y={contextY} width={width} height="72" rx="6" />
          <text x={x + 18} y={contextY + 28}>
            Context
          </text>
          <text className="part1-diagram__note" x={x + 18} y={contextY + 54}>
            The cat sat on the
          </text>
        </g>
        <path
          className="part1-diagram__path"
          markerEnd="url(#next-token-arrow)"
          d={`M${center} ${contextY + 72}V${logitsY - 20}`}
        />
        <g data-stage="vocabulary-logits">
          <text className="part1-diagram__heading" x={x} y={logitsY}>
            Vocabulary logits
          </text>
          <text className="part1-diagram__note" x={x} y={logitsY + 26}>
            Softmax 이전 raw score · 설명용 순위
          </text>
          {LOGIT_ROWS.map(([label, ratio], index) => {
            const y = logitsY + 58 + index * 42;
            return (
              <g key={label} className="part1-diagram__score-row">
                <text x={x} y={y + 16}>
                  {label}
                </text>
                <rect
                  className="part1-diagram__score-track"
                  x={x + 86}
                  y={y}
                  width={width - 86}
                  height="18"
                  rx="3"
                />
                <rect
                  className="part1-diagram__score-value"
                  x={x + 86}
                  y={y}
                  width={(width - 86) * ratio}
                  height="18"
                  rx="3"
                />
              </g>
            );
          })}
        </g>
        <path
          className="part1-diagram__path"
          markerEnd="url(#next-token-arrow)"
          d={`M${center} ${logitsY + 188}V${distributionY - 18}`}
        />
        <g data-stage="selection-distribution">
          <text
            className="part1-diagram__heading"
            x={center}
            y={distributionY}
            textAnchor="middle"
          >
            Selection distribution
          </text>
          <text
            className="part1-diagram__note"
            x={center}
            y={distributionY + 28}
            textAnchor="middle"
          >
            Temperature · Top-K · Softmax
          </text>
          <path
            className="part1-diagram__distribution-line"
            d={`M${x} ${distributionY + 52}H${x + width}`}
          />
          {[0.18, 0.42, 0.72].map((ratio) => (
            <circle
              key={ratio}
              className="part1-diagram__probability-dot"
              cx={x + width * ratio}
              cy={distributionY + 52}
              r={ratio * 12 + 5}
            />
          ))}
        </g>
        <path
          className="part1-diagram__path"
          markerEnd="url(#next-token-arrow)"
          d={`M${center} ${distributionY + 74}V${samplerY - 34}`}
        />
        <g className="part1-diagram__sampler" data-stage="sampler">
          <path
            d={`M${center} ${samplerY - 34}L${center + 70} ${samplerY}L${center} ${samplerY + 34}L${center - 70} ${samplerY}Z`}
          />
          <text x={center} y={samplerY + 6} textAnchor="middle">
            Sampler
          </text>
        </g>
        <path
          className="part1-diagram__path"
          markerEnd="url(#next-token-arrow)"
          d={`M${center} ${samplerY + 34}V${nextY - 18}`}
        />
        <g className="part1-diagram__selected" data-stage="next-token">
          <rect x={center - 70} y={nextY} width="140" height="56" rx="6" />
          <text x={center} y={nextY + 23} textAnchor="middle">
            Next Token
          </text>
          <text
            className="part1-diagram__note"
            x={center}
            y={nextY + 45}
            textAnchor="middle"
          >
            한 후보 선택
          </text>
        </g>
      </svg>
      <div className="part1-diagram__fallback">
        <fieldset aria-label="다음 Token 예측 의미 설명">
          <ol>
            <li>Context: The cat sat on the</li>
            <li>Vocabulary logits: 모든 token 후보의 raw score</li>
            <li>Selection distribution: Temperature · Top-K · Softmax</li>
            <li>Sampler: 선택 규칙 실행</li>
            <li>Next Token: 후보 하나 선택</li>
          </ol>
        </fieldset>
      </div>
    </div>
  );
}
