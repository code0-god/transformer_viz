import { type ReactElement, useSyncExternalStore } from "react";

const MOBILE_LAYOUT_QUERY = "(max-width: 44rem)";

const STAGES = [
  ["사람이 쓰는 언어", "질문 · 문장 · 글"],
  ["숫자로 표현", "계산 가능한 형태"],
  ["모델 계산", "학습된 숫자로 계산"],
  ["활용 결과", "분류 · 검색 · 생성"],
] as const;

type StagePosition = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

const DESKTOP_POSITIONS: readonly StagePosition[] = [
  { x: 20, y: 82, width: 190, height: 82 },
  { x: 255, y: 82, width: 190, height: 82 },
  { x: 490, y: 82, width: 190, height: 82 },
  { x: 725, y: 82, width: 190, height: 82 },
];

const MOBILE_POSITIONS: readonly StagePosition[] = [
  { x: 36, y: 42, width: 288, height: 76 },
  { x: 36, y: 164, width: 288, height: 76 },
  { x: 36, y: 286, width: 288, height: 76 },
  { x: 36, y: 408, width: 288, height: 76 },
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

function connector(
  current: StagePosition,
  next: StagePosition,
  mobile: boolean,
): string {
  if (mobile) {
    const x = current.x + current.width / 2;
    return `M${x} ${current.y + current.height}V${next.y}`;
  }
  const y = current.y + current.height / 2;
  return `M${current.x + current.width} ${y}H${next.x}`;
}

export function NlpPipelineDiagram(): ReactElement {
  const mobile = useSyncExternalStore(
    subscribeToMobileLayout,
    mobileLayoutSnapshot,
    () => false,
  );
  const positions = mobile ? MOBILE_POSITIONS : DESKTOP_POSITIONS;

  return (
    <div className="part0-diagram part0-diagram--pipeline">
      <svg
        viewBox={mobile ? "0 0 360 520" : "0 0 940 240"}
        role="img"
        aria-label="자연어 처리 추론 경로"
        aria-describedby="nlp-pipeline-desc"
        data-figure-layout={mobile ? "mobile" : "desktop"}
      >
        <title id="nlp-pipeline-title">자연어 처리 추론 경로</title>
        <desc id="nlp-pipeline-desc">
          사람이 쓰는 언어를 숫자로 표현하고, 모델이 계산한 뒤, 사람이 활용하는
          결과로 이어지는 네 단계의 큰 흐름
        </desc>
        <defs>
          <marker
            id="nlp-arrow"
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
        {positions.slice(0, -1).map((position, index) => {
          const next = positions[index + 1];
          if (next === undefined) return null;
          return (
            <path
              key={`${position.x}-${position.y}`}
              className="part0-diagram__path"
              markerEnd="url(#nlp-arrow)"
              d={connector(position, next, mobile)}
            />
          );
        })}
        {STAGES.map(([label, note], index) => {
          const position = positions[index];
          if (position === undefined) return null;
          return (
            <g key={label} className="part0-diagram__stage" data-stage={label}>
              <rect
                x={position.x}
                y={position.y}
                width={position.width}
                height={position.height}
                rx="6"
              />
              <text
                x={position.x + position.width / 2}
                y={position.y + 32}
                textAnchor="middle"
              >
                {label}
              </text>
              <text
                className="part0-diagram__note"
                x={position.x + position.width / 2}
                y={position.y + 57}
                textAnchor="middle"
              >
                {note}
              </text>
            </g>
          );
        })}
        {mobile ? null : (
          <text
            className="part0-diagram__example"
            x="470"
            y="32"
            textAnchor="middle"
          >
            언어 → 숫자 → 계산 → 활용
          </text>
        )}
      </svg>
      <div className="part0-diagram__fallback">
        <fieldset aria-label="자연어 처리란? 의미 설명">
          <ol>
            {STAGES.map(([label]) => (
              <li key={label}>{label}</li>
            ))}
          </ol>
        </fieldset>
      </div>
    </div>
  );
}
