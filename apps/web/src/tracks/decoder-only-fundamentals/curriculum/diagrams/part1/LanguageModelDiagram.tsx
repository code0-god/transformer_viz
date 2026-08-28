import type { ReactElement } from "react";

const TOKENS = [
  ["context-1", "the"],
  ["context-2", "cat"],
  ["context-3", "sat"],
  ["context-4", "on"],
  ["context-5", "the"],
] as const;
const CANDIDATES = ["후보 A", "후보 B", "후보 C"] as const;

export function LanguageModelDiagram(): ReactElement {
  return (
    <div className="part1-diagram">
      <svg
        viewBox="0 0 760 470"
        role="img"
        aria-label="언어 모델의 위치별 다음-token 점수"
        aria-describedby="language-model-desc"
      >
        <title>언어 모델의 위치별 다음-token 점수</title>
        <desc id="language-model-desc">
          the cat sat on the context의 다섯 위치가 T by Vocab logit grid를
          만들고 마지막 Vocab 행만 symbolic candidates로 이어지는 구조
        </desc>
        <text className="part1-diagram__heading" x="28" y="36">
          Context strip · T positions
        </text>
        {TOKENS.map(([id, token], index) => (
          <g key={id} className="part1-diagram__token">
            <rect x={28 + index * 110} y="52" width="94" height="54" rx="10" />
            <text x={75 + index * 110} y="85" textAnchor="middle">
              {token}
            </text>
          </g>
        ))}
        <path className="part1-diagram__path" d="M302 116V150" />
        <text className="part1-diagram__heading" x="28" y="174">
          All-position logits · [T,Vocab]
        </text>
        {[0, 1, 2, 3, 4].map((row) => (
          <g key={row} data-final-row={row === 4 ? "true" : undefined}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((column) => (
              <rect
                key={column}
                className={
                  row === 4
                    ? "part1-diagram__cell part1-diagram__cell--final"
                    : "part1-diagram__cell"
                }
                x={28 + column * 55}
                y={190 + row * 38}
                width="44"
                height="26"
                rx="5"
              />
            ))}
            <text className="part1-diagram__axis" x="484" y={209 + row * 38}>
              {row === 4 ? "final [Vocab]" : `position ${row + 1}`}
            </text>
          </g>
        ))}
        <path className="part1-diagram__path" d="M492 360H562" />
        <text className="part1-diagram__heading" x="570" y="284">
          Candidates
        </text>
        {CANDIDATES.map((candidate, index) => (
          <g key={candidate} className="part1-diagram__candidate">
            <rect x="570" y={300 + index * 48} width="150" height="36" rx="8" />
            <text x="645" y={323 + index * 48} textAnchor="middle">
              {candidate}
            </text>
          </g>
        ))}
      </svg>
      <div className="part1-diagram__fallback">
        <fieldset aria-label="언어 모델이란? 의미 설명">
          <ol>
            <li>Context: the · cat · sat · on · the</li>
            <li>All-position logits: [T,Vocab]</li>
            <li>Final row: [Vocab]</li>
            <li>Symbolic candidates: 후보 A, 후보 B, 후보 C</li>
          </ol>
        </fieldset>
      </div>
    </div>
  );
}
