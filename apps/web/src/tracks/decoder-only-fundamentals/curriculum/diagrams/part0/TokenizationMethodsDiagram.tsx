import type { ReactElement } from "react";
import { curriculumTokenExamples } from "../../generated/tokenExamples";

const example = curriculumTokenExamples.find(({ id }) => id === "the-cats");
if (example === undefined)
  throw new Error("Generated the-cats example is missing");

const methods = [
  {
    id: "word",
    label: "Word",
    example: "the | cats",
    vocabulary: "큰 편",
    sequence: "짧은 편",
  },
  {
    id: "character",
    label: "Character",
    example: "t | h | e | ␠ | c | a | t | s",
    vocabulary: "작은 편",
    sequence: "긴 편",
  },
  {
    id: "subword",
    label: "Subword (개념)",
    example: "the | cat | s",
    vocabulary: "중간 조절",
    sequence: "중간 조절",
  },
  {
    id: "byte",
    label: "Current byte",
    example: example.generationPrefix
      .filter(({ kind }) => kind === "byte")
      .map(({ display }) => display)
      .join(" | "),
    vocabulary: "작고 고정적",
    sequence: "길어질 수 있음",
  },
] as const;

export function TokenizationMethodsDiagram(): ReactElement {
  return (
    <figure className="part0-diagram part0-diagram--methods">
      <svg
        viewBox="0 0 760 520"
        role="img"
        aria-label="Tokenization 방식 비교"
        aria-describedby="methods-desc"
      >
        <title id="methods-title">Tokenization 방식 비교</title>
        <desc id="methods-desc">
          the cats를 word, character, 개념적 subword, 현재 byte 방식으로 나눈
          예시와 vocabulary 크기 및 sequence 길이의 정성적 trade-off
        </desc>
        <text className="part0-diagram__example" x="28" y="40">
          같은 텍스트 “the cats”, 다른 분할 방식
        </text>
        <g className="part0-diagram__axis-headings">
          <text x="285" y="92" textAnchor="middle">
            Example
          </text>
          <text x="550" y="92" textAnchor="middle">
            Vocabulary
          </text>
          <text x="675" y="92" textAnchor="middle">
            Sequence
          </text>
        </g>
        {methods.map((method, index) => {
          const y = 116 + index * 84;
          return (
            <g
              key={method.id}
              className="part0-diagram__method-row"
              data-tokenization-method={method.id}
              data-tokenization-example={method.id}
              data-current-runtime={method.id === "byte" ? "true" : undefined}
            >
              <rect x="24" y={y} width="712" height="68" rx="14" />
              <text x="48" y={y + 28}>
                {method.label}
              </text>
              {method.id === "byte" ? (
                <text className="part0-diagram__badge" x="48" y={y + 51}>
                  CURRENT RUNTIME
                </text>
              ) : null}
              <text x="285" y={y + 41} textAnchor="middle">
                {method.example}
              </text>
              <text x="550" y={y + 41} textAnchor="middle">
                {method.vocabulary}
              </text>
              <text x="675" y={y + 41} textAnchor="middle">
                {method.sequence}
              </text>
            </g>
          );
        })}
        <g className="part0-diagram__utf8-note">
          <path className="part0-diagram__path" d="M24 468H736" />
          <text x="28" y="496">
            Vocabulary가 작아질수록 일반적으로 sequence는 길어질 수 있습니다.
          </text>
        </g>
      </svg>
      <figcaption className="part0-diagram__fallback">
        <fieldset aria-label="Tokenization 방식 의미 설명">
          <table>
            <caption>the cats를 나누는 Tokenization 방식의 trade-off</caption>
            <thead>
              <tr>
                <th scope="col">방식</th>
                <th scope="col">예시</th>
                <th scope="col">Vocabulary</th>
                <th scope="col">Sequence</th>
              </tr>
            </thead>
            <tbody>
              {methods.map((method) => (
                <tr key={method.id}>
                  <th scope="row">{method.label}</th>
                  <td>{method.example}</td>
                  <td>{method.vocabulary}</td>
                  <td>{method.sequence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </fieldset>
      </figcaption>
    </figure>
  );
}
