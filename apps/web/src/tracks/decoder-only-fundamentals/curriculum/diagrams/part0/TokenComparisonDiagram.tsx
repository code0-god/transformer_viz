import type { ReactElement } from "react";
import { curriculumTokenExamples } from "../../generated/tokenExamples";

const example = curriculumTokenExamples.find(({ id }) => id === "the-cats");
if (example === undefined)
  throw new Error("Generated the-cats example is missing");
const lenses = [
  { id: "word", label: "Word", values: ["the", "cats"] },
  {
    id: "character",
    label: "Character",
    values: ["t", "h", "e", "␠", "c", "a", "t", "s"],
  },
  { id: "subword", label: "Conceptual subword", values: ["the", "cat", "s"] },
  {
    id: "byte",
    label: "Current Rust UTF-8 byte",
    values: example.generationPrefix
      .filter(({ kind }) => kind === "byte")
      .map(({ display }) => display),
  },
] as const;

export function TokenComparisonDiagram(): ReactElement {
  return (
    <figure className="part0-diagram part0-diagram--token">
      <svg
        viewBox="0 0 760 570"
        role="img"
        aria-label="Token 경계 비교"
        aria-describedby="token-comparison-desc"
      >
        <title id="token-comparison-title">Token 경계 비교</title>
        <desc id="token-comparison-desc">
          the cats를 word, character, conceptual subword, 현재 Rust UTF-8 byte
          관점의 2행 2열 렌즈로 비교
        </desc>
        <text
          className="part0-diagram__example"
          x="380"
          y="38"
          textAnchor="middle"
        >
          같은 입력 “the cats”, 다른 경계
        </text>
        {lenses.map((lens, index) => {
          const x = index % 2 === 0 ? 24 : 392;
          const y = index < 2 ? 66 : 310;
          return (
            <g
              key={lens.id}
              className="part0-diagram__lens"
              data-token-lens={lens.id}
            >
              <rect x={x} y={y} width="344" height="216" rx="16" />
              <text x={x + 24} y={y + 38}>
                {lens.label}
              </text>
              <line x1={x + 24} y1={y + 56} x2={x + 320} y2={y + 56} />
              {lens.values.map((value, valueIndex) => {
                const column = valueIndex % 4;
                const row = Math.floor(valueIndex / 4);
                const cellX = x + 24 + column * 76;
                const cellY = y + 80 + row * 52;
                return (
                  <g
                    key={`${lens.id}-${cellX}-${cellY}`}
                    className="part0-diagram__token-cell"
                  >
                    <rect x={cellX} y={cellY} width="64" height="36" rx="8" />
                    <text x={cellX + 32} y={cellY + 24} textAnchor="middle">
                      {value}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <figcaption className="part0-diagram__fallback">
        <fieldset aria-label="Token이란? 의미 설명">
          <table>
            <caption>the cats token 경계의 의미상 비교</caption>
            <thead>
              <tr>
                <th scope="col">렌즈</th>
                <th scope="col">단위</th>
              </tr>
            </thead>
            <tbody>
              {lenses.map((lens) => (
                <tr key={lens.id}>
                  <th scope="row">{lens.label}</th>
                  <td>{lens.values.join(" | ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </fieldset>
      </figcaption>
    </figure>
  );
}
