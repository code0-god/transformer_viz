import type { ReactElement } from "react";

const LOOKUPS = [
  { token: "the", id: "id₀", row: "E[id₀]" },
  { token: "cat", id: "id₁", row: "E[id₁]" },
] as const;

export function VocabularyAddressDiagram(): ReactElement {
  return (
    <div className="part0-diagram part0-diagram--vocabulary">
      <svg
        viewBox="0 0 760 300"
        role="img"
        aria-label="Token과 Token ID를 embedding row에 연결하는 vocabulary lookup"
        aria-describedby="vocabulary-desc"
      >
        <title id="vocabulary-title">
          Token, Token ID, embedding row의 관계
        </title>
        <desc id="vocabulary-desc">
          입력 token 순서에서 the와 cat을 각각 vocabulary ID로 찾고, 같은 ID의
          embedding table row를 조회하는 관계
        </desc>
        <defs>
          <marker
            id="vocabulary-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0 0 10 5 0 10Z" />
          </marker>
        </defs>
        <text className="part0-diagram__example" x="28" y="34">
          Token → ID → Embedding row
        </text>
        <g className="part0-diagram__input-sequence">
          <text x="28" y="76">
            입력 순서
          </text>
          <text className="part0-diagram__lookup-value" x="126" y="76">
            the · cat
          </text>
          <path
            className="part0-diagram__sequence-link"
            markerEnd="url(#vocabulary-arrow)"
            d="M380 82V112"
          />
        </g>
        <g className="part0-diagram__lookup-headings">
          <text x="90" y="126" textAnchor="middle">
            Token
          </text>
          <text x="380" y="126" textAnchor="middle">
            Vocabulary ID
          </text>
          <text x="650" y="126" textAnchor="middle">
            Embedding row
          </text>
        </g>
        {LOOKUPS.map(({ token, id, row }, index) => {
          const y = 174 + index * 72;
          return (
            <g
              key={token}
              className="part0-diagram__lookup-row"
              data-vocabulary-lookup={token}
            >
              <text
                className="part0-diagram__lookup-value"
                x="90"
                y={y}
                textAnchor="middle"
              >
                {token}
              </text>
              <path
                className="part0-diagram__lookup-edge"
                markerEnd="url(#vocabulary-arrow)"
                d={`M150 ${y - 6}H330`}
              />
              <text
                className="part0-diagram__lookup-value"
                x="380"
                y={y}
                textAnchor="middle"
              >
                {id}
              </text>
              <path
                className="part0-diagram__lookup-edge"
                markerEnd="url(#vocabulary-arrow)"
                d={`M430 ${y - 6}H600`}
              />
              <text
                className="part0-diagram__lookup-value"
                x="650"
                y={y}
                textAnchor="middle"
              >
                {row}
              </text>
              <path
                className="part0-diagram__lookup-rule"
                d={`M28 ${y + 24}H732`}
              />
            </g>
          );
        })}
      </svg>
      <div className="part0-diagram__fallback">
        <fieldset aria-label="Vocabulary와 Token ID 의미 설명">
          <p>입력 순서: the · cat</p>
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
