import type { ReactElement } from "react";

import type { ScoreMatrixModel } from "../scoreMatrixModel";
import {
  formatScoreMatrixValue,
  type ScoreMatrixCellKey,
  scoreMatrixCellKey,
} from "./scoreMatrixGeometry";
import "./scoreMatrix.css";

type ScoreMatrixTableProps = Readonly<{
  model: ScoreMatrixModel;
  selectedCellKey: ScoreMatrixCellKey | null;
  onSelect?: (cellKey: ScoreMatrixCellKey) => void;
  showSelectionSummary?: boolean;
}>;

type ScoreMatrixSelectionProps = Pick<
  ScoreMatrixTableProps,
  "model" | "selectedCellKey"
> & {
  readonly className?: string;
};

function maskStatus(
  allowed: boolean,
  blockedByLaterCausalMask: boolean,
): string {
  if (blockedByLaterCausalMask) return "이후 토큰 인과 마스크로 차단됨";
  return allowed ? "허용됨" : "마스크로 차단됨";
}

export function ScoreMatrixSelection({
  model,
  selectedCellKey,
  className = "score-matrix-selection",
}: ScoreMatrixSelectionProps): ReactElement {
  const selectedCell = model.cells.find(
    (cell) =>
      scoreMatrixCellKey(cell.queryIndex, cell.keyIndex) === selectedCellKey,
  );

  const status =
    selectedCell === undefined
      ? null
      : maskStatus(selectedCell.allowed, selectedCell.blockedByLaterCausalMask);

  return (
    <aside
      className={className}
      role="status"
      data-selected={selectedCell === undefined ? "false" : "true"}
    >
      <strong>Selected cell</strong>
      {selectedCell === undefined || status === null ? (
        <p>3D bar 또는 2D cell을 선택하세요.</p>
      ) : (
        <>
          <dl>
            <div>
              <dt>Query</dt>
              <dd data-selected-axis="query">
                {selectedCell.queryIndex} ·{" "}
                {JSON.stringify(selectedCell.queryTokenLabel)}
              </dd>
            </div>
            <div>
              <dt>Key</dt>
              <dd data-selected-axis="key">
                {selectedCell.keyIndex} ·{" "}
                {JSON.stringify(selectedCell.keyTokenLabel)}
              </dd>
            </div>
            <div>
              <dt>Score</dt>
              <dd data-selected-value="score">
                {formatScoreMatrixValue(selectedCell.value)}
              </dd>
            </div>
            <div>
              <dt>Mask</dt>
              <dd>{status}</dd>
            </div>
          </dl>
          <span className="score-matrix-visually-hidden">
            {`선택: 질의 ${selectedCell.queryIndex} ${selectedCell.queryTokenLabel}, 키 ${selectedCell.keyIndex} ${selectedCell.keyTokenLabel}, 점수 ${formatScoreMatrixValue(selectedCell.value)}, ${status}`}
          </span>
        </>
      )}
    </aside>
  );
}

export function ScoreMatrixTable({
  model,
  selectedCellKey,
  onSelect,
  showSelectionSummary = true,
}: ScoreMatrixTableProps): ReactElement {
  return (
    <div className="score-matrix-table-scroll">
      <table className="score-matrix-table">
        <caption>
          Score Matrix — Layer {model.layer + 1}, Head {model.head + 1} exact
          values
        </caption>
        <thead>
          <tr>
            <th scope="col">질의 \ 키</th>
            {model.keyTokenLabels.map((label, keyIndex) => (
              <th key={scoreMatrixCellKey(-1, keyIndex)} scope="col">
                키 {keyIndex}: {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {model.queryTokenLabels.map((label, queryIndex) => (
            <tr key={scoreMatrixCellKey(queryIndex, -1)}>
              <th scope="row">
                질의 {queryIndex}: {label}
              </th>
              {model.cells
                .slice(queryIndex * model.size, (queryIndex + 1) * model.size)
                .map((cell) => {
                  const key = scoreMatrixCellKey(
                    cell.queryIndex,
                    cell.keyIndex,
                  );
                  const status = maskStatus(
                    cell.allowed,
                    cell.blockedByLaterCausalMask,
                  );
                  return (
                    <td
                      key={key}
                      aria-label={`질의 ${cell.queryIndex} ${cell.queryTokenLabel}, 키 ${cell.keyIndex} ${cell.keyTokenLabel}: ${formatScoreMatrixValue(cell.value)}, ${status}`}
                      data-selected={key === selectedCellKey}
                      data-mask-status={cell.allowed ? "allowed" : "masked"}
                    >
                      {onSelect === undefined ? (
                        <>
                          <span>{formatScoreMatrixValue(cell.value)}</span>
                          <span className="score-matrix-visually-hidden">
                            {status}
                          </span>
                        </>
                      ) : (
                        <button
                          className="score-matrix-cell-button"
                          type="button"
                          aria-label={`질의 ${cell.queryIndex} ${cell.queryTokenLabel}, 키 ${cell.keyIndex} ${cell.keyTokenLabel}: ${formatScoreMatrixValue(cell.value)}, ${status}`}
                          aria-pressed={key === selectedCellKey}
                          onClick={() => onSelect(key)}
                        >
                          <span>{formatScoreMatrixValue(cell.value)}</span>
                          <span className="score-matrix-visually-hidden">
                            {status}
                          </span>
                        </button>
                      )}
                    </td>
                  );
                })}
            </tr>
          ))}
        </tbody>
      </table>
      {showSelectionSummary ? (
        <ScoreMatrixSelection model={model} selectedCellKey={selectedCellKey} />
      ) : null}
    </div>
  );
}
