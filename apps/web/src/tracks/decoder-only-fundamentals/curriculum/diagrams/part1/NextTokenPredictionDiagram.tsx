import type { ReactElement } from "react";

const STAGES = [
  ["Context", "the cat sat on the"],
  ["Transformer", "prefix 계산"],
  ["Last hidden", "마지막 위치"],
  ["LM head", "Vocab 투영"],
  ["Raw logit", "모델 점수"],
  ["Inspection probability", "full vocabulary"],
  ["Sampler probability", "Temperature / Top-K retained set"],
  ["Selected token", "한 후보"],
] as const;

export function NextTokenPredictionDiagram(): ReactElement {
  return (
    <figure className="part1-diagram">
      <svg
        viewBox="0 0 520 944"
        role="img"
        aria-label="다음 Token 선택 단계"
        aria-describedby="next-token-desc"
      >
        <title>다음 Token 선택 단계</title>
        <desc id="next-token-desc">
          Context부터 raw logit, full-vocabulary inspection probability,
          temperature와 Top-K 이후 sampler retained-set probability, selected
          token까지 구분한 위에서 아래 방향의 흐름
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
        {STAGES.map(([title, note], index) => {
          const x = 80;
          const y = 28 + index * 116;
          return (
            <g key={title} className="part1-diagram__stage" data-stage={title}>
              <rect x={x} y={y} width="360" height="76" rx="12" />
              <text x={x + 20} y={y + 30}>
                {title}
              </text>
              <text className="part1-diagram__note" x={x + 20} y={y + 56}>
                {note}
              </text>
              {index < STAGES.length - 1 ? (
                <path
                  className="part1-diagram__path"
                  markerEnd="url(#next-token-arrow)"
                  d={`M260 ${y + 76}V${y + 108}`}
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="part1-diagram__fallback">
        <fieldset aria-label="다음 Token 예측 의미 설명">
          <ol>
            {STAGES.map(([title, note]) => (
              <li key={title}>
                <strong>{title}</strong>: {note}
              </li>
            ))}
          </ol>
        </fieldset>
      </figcaption>
    </figure>
  );
}
