import type { ReactElement, Ref } from "react";
import { curriculumTokenExamples } from "../../generated/tokenExamples";

type TokenizationMethodsDiagramProps = {
  readonly focusButtonRef: Ref<HTMLButtonElement>;
  readonly onFocusGuide: () => void;
};

const koreanExample = curriculumTokenExamples.find(
  ({ id }) => id === "korean-han",
);
if (koreanExample === undefined)
  throw new Error("Generated korean-han example is missing");
const koreanBytes = koreanExample.generationPrefix.filter(
  ({ kind }) => kind === "byte",
);
const methods = [
  {
    id: "word",
    label: "Word",
    vocabulary: "큰 편",
    sequence: "짧은 편",
    coverage: "새 단어에 민감",
  },
  {
    id: "character",
    label: "Character",
    vocabulary: "작은 편",
    sequence: "긴 편",
    coverage: "문자 조합",
  },
  {
    id: "subword",
    label: "Subword / BPE",
    vocabulary: "중간 조절",
    sequence: "중간 조절",
    coverage: "조각 재사용",
  },
  {
    id: "byte",
    label: "Byte fallback",
    vocabulary: "작고 고정적",
    sequence: "길어질 수 있음",
    coverage: "UTF-8 byte",
  },
] as const;

export function TokenizationMethodsDiagram({
  focusButtonRef,
  onFocusGuide,
}: TokenizationMethodsDiagramProps): ReactElement {
  return (
    <figure className="part0-diagram part0-diagram--methods">
      <svg
        viewBox="0 0 760 560"
        role="img"
        aria-label="Tokenization 방식의 정성 비교"
        aria-describedby="methods-desc"
      >
        <title id="methods-title">Tokenization 방식의 정성 비교</title>
        <desc id="methods-desc">
          word, character, subword, byte 방식을 vocabulary 크기, sequence 길이,
          coverage 축으로 비교하며 byte 행만 현재 runtime으로 표시
        </desc>
        <text className="part0-diagram__example" x="28" y="40">
          “the cats”를 나누는 네 선택
        </text>
        <g className="part0-diagram__axis-headings">
          <text x="280" y="92" textAnchor="middle">
            Vocabulary
          </text>
          <text x="470" y="92" textAnchor="middle">
            Sequence
          </text>
          <text x="650" y="92" textAnchor="middle">
            Coverage
          </text>
        </g>
        {methods.map((method, index) => {
          const y = 116 + index * 92;
          return (
            <g
              key={method.id}
              className="part0-diagram__method-row"
              data-tokenization-method={method.id}
              data-current-runtime={method.id === "byte" ? "true" : undefined}
            >
              <rect x="24" y={y} width="712" height="72" rx="14" />
              <text x="48" y={y + 31}>
                {method.label}
              </text>
              {method.id === "byte" ? (
                <text className="part0-diagram__badge" x="48" y={y + 54}>
                  CURRENT RUNTIME
                </text>
              ) : null}
              <text x="280" y={y + 43} textAnchor="middle">
                {method.vocabulary}
              </text>
              <text x="470" y={y + 43} textAnchor="middle">
                {method.sequence}
              </text>
              <text x="650" y={y + 43} textAnchor="middle">
                {method.coverage}
              </text>
            </g>
          );
        })}
        <g className="part0-diagram__utf8-note">
          <path className="part0-diagram__path" d="M24 508H736" />
          <text x="28" y="540">
            한 → {koreanBytes.map(({ display }) => display).join(" · ")} ·
            UTF-8-safe truncation
          </text>
        </g>
      </svg>
      <figcaption className="part0-diagram__fallback">
        <fieldset aria-label="Tokenization 방식 의미 설명">
          <table>
            <caption>Tokenization 방식의 정성적 trade-off</caption>
            <thead>
              <tr>
                <th scope="col">방식</th>
                <th scope="col">Vocabulary</th>
                <th scope="col">Sequence</th>
                <th scope="col">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {methods.map((method) => (
                <tr key={method.id} data-tokenization-method={method.id}>
                  <th scope="row">{method.label}</th>
                  <td>{method.vocabulary}</td>
                  <td>{method.sequence}</td>
                  <td>{method.coverage}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
