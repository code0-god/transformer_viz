import type { ReactElement, Ref } from "react";

type Props = {
  readonly focusButtonRef: Ref<HTMLButtonElement>;
  readonly onFocusGuide: () => void;
};
const FACTORS = [
  ["A", "P(w₁)"],
  ["B | A", "P(w₂ | w₁)"],
  ["C | A,B", "P(w₃ | w₁,w₂)"],
] as const;

export function ConditionalProbabilityDiagram({
  focusButtonRef,
  onFocusGuide,
}: Props): ReactElement {
  return (
    <figure className="part1-diagram">
      <svg
        viewBox="0 0 760 450"
        role="img"
        aria-label="Prefix 조건부 확률과 chain rule"
        aria-describedby="conditional-desc"
      >
        <title>Prefix 조건부 확률과 chain rule</title>
        <desc id="conditional-desc">
          A에서 B, C로 이어질 때 각 token이 이전 prefix만 조건으로 가지며 세
          조건부 확률을 곱해 joint probability를 구성하는 도식
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
        <text className="part1-diagram__heading" x="30" y="42">
          Causal prefix branches
        </text>
        {FACTORS.map(([label, probability], index) => {
          const x = 44 + index * 240;
          return (
            <g key={label} className="part1-diagram__stage">
              <rect x={x} y="78" width="190" height="92" rx="14" />
              <text x={x + 95} y="116" textAnchor="middle">
                {label}
              </text>
              <text
                className="part1-diagram__note"
                x={x + 95}
                y="145"
                textAnchor="middle"
              >
                {probability}
              </text>
              {index < 2 ? (
                <path
                  className="part1-diagram__path"
                  markerEnd="url(#conditional-arrow)"
                  d={`M${x + 190} 124H${x + 226}`}
                />
              ) : null}
            </g>
          );
        })}
        <path className="part1-diagram__path" d="M139 188V260H619V188" />
        <path className="part1-diagram__path" d="M379 188V260" />
        <g className="part1-diagram__product">
          <rect x="110" y="284" width="540" height="104" rx="14" />
          <text x="380" y="326" textAnchor="middle">
            Joint probability = prefix factors multiplied
          </text>
          <text
            className="part1-diagram__note"
            x="380"
            y="356"
            textAnchor="middle"
          >
            현재 조건에는 미래 token이 들어가지 않음
          </text>
        </g>
      </svg>
      <figcaption className="part1-diagram__fallback">
        <fieldset aria-label="조건부 확률 의미 설명">
          <ol>
            {FACTORS.map(([label, probability]) => (
              <li key={label}>
                {label}: {probability}
              </li>
            ))}
            <li>Joint probability: 세 prefix factor의 곱</li>
          </ol>
        </fieldset>
      </figcaption>
      <button
        ref={focusButtonRef}
        type="button"
        className="part1-diagram__focus"
        onClick={onFocusGuide}
      >
        개념 설명에 초점
      </button>
    </figure>
  );
}
