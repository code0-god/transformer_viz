import type { ReactElement, Ref } from "react";

type Props = {
  readonly focusButtonRef: Ref<HTMLButtonElement>;
  readonly onFocusGuide: () => void;
};
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

export function NextTokenPredictionDiagram({
  focusButtonRef,
  onFocusGuide,
}: Props): ReactElement {
  return (
    <figure className="part1-diagram">
      <svg
        viewBox="0 0 760 500"
        role="img"
        aria-label="다음 Token 선택 단계"
        aria-describedby="next-token-desc"
      >
        <title>다음 Token 선택 단계</title>
        <desc id="next-token-desc">
          Context부터 raw logit, full-vocabulary inspection probability,
          temperature와 Top-K 이후 sampler retained-set probability, selected
          token까지 구분한 흐름
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
          const column = index % 2;
          const row = Math.floor(index / 2);
          const x = 36 + column * 370;
          const y = 34 + row * 112;
          return (
            <g key={title} className="part1-diagram__stage" data-stage={title}>
              <rect x={x} y={y} width="318" height="78" rx="12" />
              <text x={x + 20} y={y + 31}>
                {title}
              </text>
              <text className="part1-diagram__note" x={x + 20} y={y + 57}>
                {note}
              </text>
              {index < STAGES.length - 1 ? (
                <path
                  className="part1-diagram__path"
                  markerEnd="url(#next-token-arrow)"
                  d={
                    column === 0
                      ? `M${x + 318} ${y + 39}H${x + 354}`
                      : `M${x + 159} ${y + 78}V${y + 105}H195`
                  }
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
