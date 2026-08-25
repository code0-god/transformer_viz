import type { ReactElement, Ref } from "react";

type NlpPipelineDiagramProps = {
  readonly focusButtonRef: Ref<HTMLButtonElement>;
  readonly onFocusGuide: () => void;
};

const STAGES = [
  ["Natural Language", "Text"],
  ["Tokenizer", "경계 결정"],
  ["Token IDs", "숫자 주소"],
  ["Neural Model", "가중치 계산"],
  ["Logits", "후보 점수"],
  ["Softmax / Sampling", "선택 규칙"],
  ["Task Output", "사람이 쓰는 결과"],
] as const;

export function NlpPipelineDiagram({
  focusButtonRef,
  onFocusGuide,
}: NlpPipelineDiagramProps): ReactElement {
  return (
    <figure className="part0-diagram part0-diagram--pipeline">
      <svg
        viewBox="0 0 760 470"
        role="img"
        aria-label="자연어 처리 추론 경로"
        aria-describedby="nlp-pipeline-desc"
      >
        <title id="nlp-pipeline-title">자연어 처리 추론 경로</title>
        <desc id="nlp-pipeline-desc">
          the cat 텍스트가 tokenizer, token IDs, neural model, logits, softmax와
          sampling을 지나 task output으로 이어지는 상징적 경로
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
          d="M160 105H276"
        />
        <path
          className="part0-diagram__path"
          markerEnd="url(#nlp-arrow)"
          d="M456 105H572"
        />
        <path
          className="part0-diagram__path"
          markerEnd="url(#nlp-arrow)"
          d="M662 155V226"
        />
        <path
          className="part0-diagram__path"
          markerEnd="url(#nlp-arrow)"
          d="M572 285H456"
        />
        <path
          className="part0-diagram__path"
          markerEnd="url(#nlp-arrow)"
          d="M276 285H160"
        />
        <path
          className="part0-diagram__path"
          markerEnd="url(#nlp-arrow)"
          d="M70 335V386H286"
        />
        {STAGES.map(([label, note], index) => {
          const positions = [
            [20, 55],
            [286, 55],
            [572, 55],
            [572, 235],
            [286, 235],
            [20, 235],
            [286, 376],
          ] as const;
          const position = positions[index];
          if (position === undefined) return null;
          const [x, y] = position;
          return (
            <g key={label} className="part0-diagram__stage" data-stage={label}>
              <rect
                x={x}
                y={y}
                width={index === 6 ? 188 : 180}
                height={100}
                rx="14"
              />
              <text
                x={x + (index === 6 ? 94 : 90)}
                y={y + 42}
                textAnchor="middle"
              >
                {label}
              </text>
              <text
                className="part0-diagram__note"
                x={x + (index === 6 ? 94 : 90)}
                y={y + 69}
                textAnchor="middle"
              >
                {note}
              </text>
            </g>
          );
        })}
        <text
          className="part0-diagram__example"
          x="110"
          y="34"
          textAnchor="middle"
        >
          “the cat”
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
      <button
        ref={focusButtonRef}
        type="button"
        className="part0-diagram__focus"
        onClick={onFocusGuide}
      >
        개념 설명에 초점
      </button>
    </figure>
  );
}
