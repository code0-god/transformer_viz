import type { ReactElement } from "react";

const LOOKUPS = [
  { token: "the", id: "id₀", row: "E[id₀]" },
  { token: "cat", id: "id₁", row: "E[id₁]" },
] as const;

export function VocabularyAddressDiagram(): ReactElement {
  return (
    <div className="part0-diagram part0-diagram--vocabulary">
      <svg
        viewBox="0 0 760 420"
        role="img"
        aria-label="Token과 Token ID를 embedding row에 연결하는 vocabulary lookup"
        aria-describedby="vocabulary-desc"
      >
        <title id="vocabulary-title">
          Token, Token ID, embedding row의 관계
        </title>
        <desc id="vocabulary-desc">
          Vocabulary에서 the와 cat token을 각각 숫자 ID로 찾고, 같은 ID의
          embedding table row를 조회하는 관계
        </desc>
        <text className="part0-diagram__example" x="28" y="36">
          Vocabulary lookup · token과 숫자 주소
        </text>
        <g className="part0-diagram__address-board">
          <rect x="24" y="62" width="294" height="244" rx="8" />
          <text x="50" y="102">
            Vocabulary
          </text>
          {LOOKUPS.map(({ token, id }, index) => (
            <g key={token} className="part0-diagram__address-row">
              <rect
                x="50"
                y={132 + index * 72}
                width="242"
                height="48"
                rx="6"
              />
              <text x="66" y={162 + index * 72}>
                {token}
              </text>
              <text x="276" y={162 + index * 72} textAnchor="end">
                {id}
              </text>
            </g>
          ))}
        </g>
        <g className="part0-diagram__sequence-board">
          <text x="356" y="92">
            Token ID sequence
          </text>
          <path className="part0-diagram__path" d="M356 112H724" />
          {LOOKUPS.map(({ token, id }, index) => (
            <g key={`id-${token}`} className="part0-diagram__sequence-token">
              <rect
                x={356 + index * 150}
                y="132"
                width="132"
                height="54"
                rx="6"
              />
              <text x={422 + index * 150} y="165" textAnchor="middle">
                {token} · {id}
              </text>
            </g>
          ))}
          <text x="356" y="236">
            Embedding row lookup
          </text>
          <path className="part0-diagram__path" d="M356 256H724" />
          {LOOKUPS.map(({ token, id, row }, index) => (
            <g key={`row-${token}`} className="part0-diagram__sequence-token">
              <rect
                x={356 + index * 150}
                y="276"
                width="132"
                height="54"
                rx="6"
              />
              <text x={422 + index * 150} y="309" textAnchor="middle">
                {id} · {row}
              </text>
            </g>
          ))}
        </g>
        <g className="part0-diagram__reserved-legend">
          <rect x="24" y="348" width="712" height="48" rx="6" />
          <text className="part0-diagram__note" x="48" y="379">
            같은 Token ID는 같은 embedding table row를 가리킵니다.
          </text>
        </g>
      </svg>
      <div className="part0-diagram__fallback">
        <fieldset aria-label="Vocabulary와 Token ID 의미 설명">
          <ol>
            {LOOKUPS.map(({ token, id, row }) => (
              <li key={token}>
                {token} token → {id} → embedding row {row}
              </li>
            ))}
          </ol>
        </fieldset>
      </div>
    </div>
  );
}
