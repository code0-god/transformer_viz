import { useSyncExternalStore } from "react";

const MOBILE_LAYOUT_QUERY = "(max-width: 44rem)";

const TOKENS = [
  { id: "the", value: "The", desktopWidth: 124, mobileWidth: 96 },
  { id: "cats", value: "cats", desktopWidth: 164, mobileWidth: 124 },
  { id: "are", value: "are", desktopWidth: 124, mobileWidth: 96 },
  {
    id: "sleeping",
    value: "sleeping",
    desktopWidth: 244,
    mobileWidth: 188,
  },
  { id: "period", value: ".", desktopWidth: 68, mobileWidth: 52 },
] as const;

type TokenLayout = Readonly<{
  id: string;
  value: string;
  x: number;
  width: number;
  y: number;
  row: number;
}>;

const MOBILE_LAYOUTS: readonly TokenLayout[] = [
  { id: "the", value: "The", x: 24, width: 84, y: 202, row: 1 },
  { id: "cats", value: "cats", x: 122, width: 124, y: 202, row: 1 },
  { id: "are", value: "are", x: 260, width: 84, y: 202, row: 1 },
  {
    id: "sleeping",
    value: "sleeping",
    x: 42,
    width: 190,
    y: 352,
    row: 2,
  },
  { id: "period", value: ".", x: 246, width: 60, y: 352, row: 2 },
];

function subscribeToMobileLayout(onStoreChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const query = window.matchMedia(MOBILE_LAYOUT_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function mobileLayoutSnapshot(): boolean {
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia(MOBILE_LAYOUT_QUERY).matches;
}

function tokenLayout(portrait: boolean): readonly TokenLayout[] {
  if (portrait) return MOBILE_LAYOUTS;
  const gap = 18;
  let x = 95;
  return TOKENS.map((token) => {
    const width = token.desktopWidth;
    const layout = {
      id: token.id,
      value: token.value,
      x,
      width,
      y: 250,
      row: 1,
    };
    x += width + gap;
    return layout;
  });
}

export function TokenComparisonDiagram() {
  const portrait = useSyncExternalStore(
    subscribeToMobileLayout,
    mobileLayoutSnapshot,
    () => false,
  );
  const viewWidth = portrait ? 368 : 1_000;
  const viewHeight = portrait ? 560 : 520;
  const sourceX = portrait ? 24 : 95;
  const layouts = tokenLayout(portrait);

  return (
    <div
      className="part0-diagram part0-token-concept"
      data-figure-type="concept-illustration"
      data-figure-question="What is a token boundary?"
    >
      <svg
        viewBox={portrait ? `0 0 ${viewWidth} ${viewHeight}` : "60 45 900 430"}
        role="img"
        aria-label="Token 개념 흐름"
        preserveAspectRatio="xMidYMid meet"
      >
        <desc>
          원문 The cats are sleeping.에 경계를 표시하고 다섯 개의 token
          segment로 나눈 개념 그림입니다.
        </desc>

        <text
          className="part0-token-concept__eyebrow"
          x={sourceX}
          y={portrait ? 48 : 68}
        >
          원문
        </text>
        <text
          className="part0-token-concept__source"
          data-token-source
          x={sourceX}
          y={portrait ? 88 : 140}
        >
          “The cats are sleeping.”
        </text>
        <text
          className="part0-token-concept__boundary-label"
          x={sourceX}
          y={portrait ? 152 : 218}
        >
          tokenizer가 정한 경계
        </text>

        <g className="part0-token-concept__segments">
          {layouts.map((token, index) => {
            return (
              <g key={token.id}>
                {index === 0 ? null : (
                  <line
                    className="part0-token-concept__boundary"
                    data-token-boundary
                    x1={token.x - (portrait ? 7 : 9)}
                    y1={token.y - 28}
                    x2={token.x - (portrait ? 7 : 9)}
                    y2={token.y - 4}
                  />
                )}
                <g
                  className="part0-token-concept__segment"
                  data-token-segment={token.id}
                  data-token-row={token.row}
                >
                  <rect
                    x={token.x}
                    y={token.y}
                    width={token.width}
                    height={72}
                    rx={4}
                  />
                  <text
                    x={token.x + token.width / 2}
                    y={token.y + 44}
                    textAnchor="middle"
                  >
                    {token.value}
                  </text>
                  <path
                    className="part0-token-concept__bracket"
                    d={`M ${token.x} ${token.y + 90} V ${token.y + 102} H ${token.x + token.width} V ${token.y + 90}`}
                  />
                  <text
                    className="part0-token-concept__token-label"
                    x={token.x + token.width / 2}
                    y={token.y + 132}
                    textAnchor="middle"
                  >
                    token {index + 1}
                  </text>
                </g>
              </g>
            );
          })}
        </g>

        <text
          className="part0-token-concept__conclusion"
          x={sourceX}
          y={portrait ? 532 : 458}
        >
          5 tokens · 순서를 가진 text units
        </text>
      </svg>

      <fieldset className="part0-diagram__fallback part0-token-concept__fallback learning-visually-hidden">
        <legend className="learning-visually-hidden">
          Token이란? 의미 설명
        </legend>
        <p>
          <strong>원문</strong> “The cats are sleeping.”
        </p>
        <ul aria-label="Token 순서">
          {TOKENS.map((token) => (
            <li key={token.id}>{token.value}</li>
          ))}
        </ul>
        <p>Token 경계는 tokenizer 방식에 따라 달라집니다.</p>
      </fieldset>
    </div>
  );
}
