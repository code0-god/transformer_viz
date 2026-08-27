import type { ReactElement } from "react";

const STAGES = [
  ["사람이 쓰는 텍스트", "질문 · 문장 · 글"],
  ["숫자로 표현하기", "계산할 수 있는 형태"],
  ["모델의 계산", "학습된 숫자로 계산"],
  ["사람이 사용하는 결과", "분류 · 검색 · 생성"],
] as const;

export function NlpPipelineDiagram(): ReactElement {
  return (
    <figure className="part0-diagram part0-diagram--pipeline">
      <svg
        viewBox="0 0 520 640"
        role="img"
        aria-label="자연어 처리 추론 경로"
        aria-describedby="nlp-pipeline-desc"
      >
        <title id="nlp-pipeline-title">자연어 처리 추론 경로</title>
        <desc id="nlp-pipeline-desc">
          사람이 쓰는 텍스트를 숫자로 표현하고, 모델이 계산한 뒤, 사람이
          사용하는 결과로 이어지는 네 단계의 큰 흐름
        </desc>
        <defs>
          <marker
            id="nlp-arrow"
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
        <path
          className="part0-diagram__path"
          markerEnd="url(#nlp-arrow)"
          d="M260 150V205"
        />
        <path
          className="part0-diagram__path"
          markerEnd="url(#nlp-arrow)"
          d="M260 295V350"
        />
        <path
          className="part0-diagram__path"
          markerEnd="url(#nlp-arrow)"
          d="M260 440V495"
        />
        {STAGES.map(([label, note], index) => {
          const positions = [
            [80, 60],
            [80, 205],
            [80, 350],
            [80, 495],
          ] as const;
          const position = positions[index];
          if (position === undefined) return null;
          const [x, y] = position;
          return (
            <g key={label} className="part0-diagram__stage" data-stage={label}>
              <rect x={x} y={y} width="360" height="90" rx="16" />
              <text x={x + 180} y={y + 38} textAnchor="middle">
                {label}
              </text>
              <text
                className="part0-diagram__note"
                x={x + 180}
                y={y + 65}
                textAnchor="middle"
              >
                {note}
              </text>
            </g>
          );
        })}
        <text
          className="part0-diagram__example"
          x="260"
          y="30"
          textAnchor="middle"
        >
          언어에서 계산으로, 계산에서 활용으로
        </text>
      </svg>
      <figcaption className="part0-diagram__fallback">
        <fieldset aria-label="자연어 처리란? 의미 설명">
          <ol>
            {STAGES.map(([label]) => (
              <li key={label}>{label}</li>
            ))}
          </ol>
        </fieldset>
      </figcaption>
    </figure>
  );
}
