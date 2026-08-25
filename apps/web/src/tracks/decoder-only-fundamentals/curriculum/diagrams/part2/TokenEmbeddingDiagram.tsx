import type { ReactElement, Ref } from "react";

type Props = {
  readonly focusButtonRef: Ref<HTMLButtonElement>;
  readonly onFocusGuide: () => void;
};
const TOKENS = ["the", "cat"] as const;

export function TokenEmbeddingDiagram({
  focusButtonRef,
  onFocusGuide,
}: Props): ReactElement {
  return (
    <figure className="part2-diagram">
      <svg
        viewBox="0 0 760 460"
        role="img"
        aria-label="Token ID와 embedding table row lookup"
        aria-describedby="token-embedding-desc"
      >
        <title>Token ID와 embedding table row lookup</title>
        <desc id="token-embedding-desc">
          the cat의 symbolic token ID sequence가 Vocab by C embedding table의
          행을 찾아 T by C sequence vectors가 되는 과정
        </desc>
        <defs>
          <marker
            id="embedding-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <path d="M0 0L8 4L0 8Z" />
          </marker>
        </defs>
        <text className="part2-diagram__heading" x="28" y="38">
          Token IDs · [T]
        </text>
        {TOKENS.map((token, index) => (
          <g key={token} className="part2-diagram__address">
            <rect x={28} y={62 + index * 76} width="156" height="54" rx="8" />
            <text x="50" y={84 + index * 76}>
              {token}
            </text>
            <text
              className="part2-diagram__symbol"
              x="158"
              y={96 + index * 76}
              textAnchor="end"
            >
              id_{index}
            </text>
          </g>
        ))}
        <path
          className="part2-diagram__path"
          markerEnd="url(#embedding-arrow)"
          d="M194 126H246"
        />
        <text className="part2-diagram__heading" x="258" y="38">
          W_E · [Vocab,C]
        </text>
        {[0, 1, 2, 3, 4].map((row) => (
          <g
            key={row}
            className="part2-diagram__table-row"
            data-lookup-row={row === 1 || row === 3 ? "true" : undefined}
          >
            <text className="part2-diagram__axis" x="258" y={78 + row * 54}>
              row {row === 1 ? "id_0" : row === 3 ? "id_1" : "·"}
            </text>
            {[0, 1, 2, 3].map((column) => (
              <rect
                key={column}
                x={330 + column * 52}
                y={58 + row * 54}
                width="42"
                height="34"
                rx="5"
              />
            ))}
          </g>
        ))}
        <path
          className="part2-diagram__path"
          markerEnd="url(#embedding-arrow)"
          d="M548 126H600"
        />
        <text className="part2-diagram__heading" x="610" y="38">
          [T,C]
        </text>
        {TOKENS.map((token, index) => (
          <g key={token} className="part2-diagram__vector">
            <rect x="600" y={62 + index * 76} width="132" height="54" rx="8" />
            <text x="666" y={84 + index * 76} textAnchor="middle">
              {token}
            </text>
            <text
              className="part2-diagram__symbol"
              x="666"
              y={102 + index * 76}
              textAnchor="middle"
            >
              e_{index} · C channels
            </text>
          </g>
        ))}
        <text className="part2-diagram__note" x="28" y="406">
          주소 → learned row → 원래 sequence 순서
        </text>
      </svg>
      <figcaption className="part2-diagram__fallback">
        <fieldset aria-label="Token Embedding 의미 설명">
          <ol>
            <li>Token IDs: symbolic [T] addresses</li>
            <li>Embedding table: W_E [Vocab,C]</li>
            <li>Lookup: one learned row per ID</li>
            <li>Result: sequence vectors [T,C]</li>
          </ol>
        </fieldset>
      </figcaption>
      <button
        ref={focusButtonRef}
        type="button"
        className="part2-diagram__focus"
        onClick={onFocusGuide}
      >
        개념 설명에 초점
      </button>
    </figure>
  );
}
