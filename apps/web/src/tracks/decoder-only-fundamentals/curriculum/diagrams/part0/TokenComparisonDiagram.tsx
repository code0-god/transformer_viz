import { Fragment, type ReactElement, useSyncExternalStore } from "react";

const MOBILE_LAYOUT_QUERY = "(max-width: 40rem)";

const stages = [
  {
    id: "text",
    title: "입력 텍스트",
    detailLines: ["사람이 읽는", "문장"],
    example: "“the cats”",
  },
  {
    id: "boundary",
    title: "경계 정하기",
    detailLines: ["토크나이저가", "나눌 위치 결정"],
    example: "개념적 경계",
  },
  {
    id: "tokens",
    title: "Token 순서",
    detailLines: ["모델이 다룰", "텍스트 단위"],
    example: "[ A | B | … ]",
  },
  {
    id: "model",
    title: "순서대로 계산",
    detailLines: ["앞에서 뒤로", "token 처리"],
    example: "A, B, …",
  },
] as const;

function subscribeToMobileLayout(onStoreChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const query = window.matchMedia(MOBILE_LAYOUT_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function mobileLayoutSnapshot(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia(MOBILE_LAYOUT_QUERY).matches
  );
}

export function TokenComparisonDiagram(): ReactElement {
  const portrait = useSyncExternalStore(
    subscribeToMobileLayout,
    mobileLayoutSnapshot,
    () => false,
  );
  const stageHeight = 126;
  const stageWidth = portrait ? 344 : 160;

  return (
    <figure className="part0-diagram part0-diagram--token">
      <svg
        viewBox={portrait ? "0 0 420 700" : "0 0 760 320"}
        role="img"
        aria-label="Token 개념 흐름"
        aria-describedby="token-comparison-desc"
      >
        <title id="token-comparison-title">Token 개념 흐름</title>
        <desc id="token-comparison-desc">
          텍스트가 tokenizer의 경계 결정, 일반화된 token 순서, 모델의 순서
          계산으로 이어지는 개념적 흐름
        </desc>
        <defs>
          <marker
            id="token-flow-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <path d="M0 0L8 4L0 8Z" />
          </marker>
        </defs>
        <text
          className="part0-diagram__example"
          x={portrait ? 210 : 380}
          y="30"
          textAnchor="middle"
        >
          개념적 흐름 - 실제 tokenizer 분할 결과가 아님
        </text>
        {stages.map((stage, index) => {
          const x = portrait ? 38 : 24 + index * 184;
          const y = portrait ? 54 + index * 162 : 74;
          const nextX = portrait ? 38 : 24 + (index + 1) * 184;
          const nextY = portrait ? 54 + (index + 1) * 162 : 74;
          return (
            <Fragment key={stage.id}>
              <g className="part0-diagram__stage" data-token-stage={stage.id}>
                <rect
                  x={x}
                  y={y}
                  width={stageWidth}
                  height={stageHeight}
                  rx="16"
                />
                <text
                  className="part0-diagram__flow-title"
                  x={x + 20}
                  y={y + 32}
                >
                  {stage.title}
                </text>
                <text
                  className="part0-diagram__flow-copy"
                  x={x + 20}
                  y={y + 58}
                >
                  {stage.detailLines.map((line, lineIndex) => (
                    <tspan key={line} x={x + 20} dy={lineIndex === 0 ? 0 : 18}>
                      {line}
                    </tspan>
                  ))}
                </text>
                <text
                  className="part0-diagram__flow-example"
                  x={x + 20}
                  y={y + 108}
                >
                  {stage.example}
                </text>
              </g>
              {index < stages.length - 1 ? (
                <path
                  className="part0-diagram__path"
                  d={
                    portrait
                      ? `M${x + stageWidth / 2} ${y + stageHeight}V${nextY - 14}`
                      : `M${x + stageWidth} ${y + stageHeight / 2}H${nextX - 14}`
                  }
                  markerEnd="url(#token-flow-arrow)"
                />
              ) : null}
            </Fragment>
          );
        })}
        <text
          className="part0-diagram__note"
          x={portrait ? 210 : 380}
          y={portrait ? 684 : 278}
          textAnchor="middle"
        >
          Token은 텍스트와 모델 계산 사이를 잇는 표현 단위입니다.
        </text>
      </svg>
      <figcaption className="part0-diagram__fallback">
        <fieldset aria-label="Token이란? 의미 설명">
          <table>
            <caption>Token의 개념적 흐름</caption>
            <thead>
              <tr>
                <th scope="col">단계</th>
                <th scope="col">의미</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stage) => (
                <tr key={stage.id}>
                  <th scope="row">{stage.title}</th>
                  <td>{stage.detailLines.join(" ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </fieldset>
      </figcaption>
    </figure>
  );
}
