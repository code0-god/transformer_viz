import type { ReactElement } from "react";
import { curriculumTokenExamples } from "../../generated/tokenExamples";

const example = curriculumTokenExamples.find(({ id }) => id === "the-cat");
if (example === undefined)
  throw new Error("Generated the-cat example is missing");
const displayTokens = example.displayEncoding;
const generationTokens = example.generationPrefix;

export function VocabularyAddressDiagram(): ReactElement {
  return (
    <div className="part0-diagram part0-diagram--vocabulary">
      <svg
        viewBox="0 0 760 570"
        role="img"
        aria-label="Vocabulary 주소와 순서"
        aria-describedby="vocabulary-desc"
      >
        <title id="vocabulary-title">Vocabulary 주소와 순서</title>
        <desc id="vocabulary-desc">
          Rust fixture의 the cat display encoding과 generation prefix를 주소판에
          연결하고 reserved UNK를 의미 계산과 분리
        </desc>
        <text className="part0-diagram__example" x="28" y="36">
          Rust fixture · “the cat”
        </text>
        <g className="part0-diagram__address-board">
          <rect x="24" y="62" width="294" height="364" rx="18" />
          <text x="50" y="102">
            Vocabulary address board
          </text>
          {displayTokens.map(({ display, id, kind, byteStart }, index) => (
            <g
              key={`${kind}-${byteStart ?? "reserved"}`}
              className="part0-diagram__address-row"
            >
              <rect
                x="50"
                y={124 + index * 30}
                width="242"
                height="24"
                rx="6"
              />
              <text x="64" y={141 + index * 30}>
                {display}
              </text>
              <text x="276" y={141 + index * 30} textAnchor="end">
                ID {id}
              </text>
            </g>
          ))}
        </g>
        <g className="part0-diagram__sequence-board">
          <text x="356" y="92">
            Display encoding
          </text>
          <path className="part0-diagram__path" d="M356 112H724" />
          {displayTokens.map(({ display, kind, byteStart }, index) => (
            <g
              key={`display-${kind}-${byteStart ?? "reserved"}`}
              className="part0-diagram__sequence-token"
            >
              <rect
                x={356 + (index % 5) * 72}
                y={132 + Math.floor(index / 5) * 58}
                width="62"
                height="38"
                rx="8"
              />
              <text
                x={387 + (index % 5) * 72}
                y={157 + Math.floor(index / 5) * 58}
                textAnchor="middle"
              >
                {display}
              </text>
            </g>
          ))}
          <text x="356" y="290">
            Generation prefix · EOS 없음
          </text>
          <path className="part0-diagram__path" d="M356 310H724" />
          {generationTokens.map(({ display, kind, byteStart }, index) => (
            <g
              key={`prefix-${kind}-${byteStart ?? "reserved"}`}
              className="part0-diagram__sequence-token"
            >
              <rect
                x={356 + (index % 5) * 72}
                y={330 + Math.floor(index / 5) * 58}
                width="62"
                height="38"
                rx="8"
              />
              <text
                x={387 + (index % 5) * 72}
                y={355 + Math.floor(index / 5) * 58}
                textAnchor="middle"
              >
                {display}
              </text>
            </g>
          ))}
        </g>
        <g className="part0-diagram__reserved-legend">
          <rect x="24" y="450" width="712" height="92" rx="14" />
          <text x="48" y="482">
            Reserved legend
          </text>
          <text className="part0-diagram__note" x="48" y="514">
            UNK는 예약 주소 · 정상 UTF-8 byte sequence의 표시가 아님
          </text>
        </g>
      </svg>
      <div className="part0-diagram__fallback">
        <fieldset aria-label="Vocabulary와 Token ID 의미 설명">
          <p>
            Display encoding:{" "}
            {displayTokens
              .map(({ display, id }) => `${display}→${id}`)
              .join(" · ")}
          </p>
          <p>
            Generation prefix:{" "}
            {generationTokens
              .map(({ display, id }) => `${display}→${id}`)
              .join(" · ")}
          </p>
          <p>Reserved UNK는 주소이며 embedding 의미와 분리됩니다.</p>
        </fieldset>
      </div>
    </div>
  );
}
