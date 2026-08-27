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

  return (
    <p className={className} role="status">
      {selectedCell === undefined
        ? "선택된 셀 없음"
        : `선택: 질의 ${selectedCell.queryIndex} ${selectedCell.queryTokenLabel}, 키 ${selectedCell.keyIndex} ${selectedCell.keyTokenLabel}, 점수 ${formatScoreMatrixValue(selectedCell.value)}, ${maskStatus(selectedCell.allowed, selectedCell.blockedByLaterCausalMask)}`}
    </p>
  );
}

export function ScoreMatrixTable({
  model,
  selectedCellKey,
  onSelect,
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
      <ScoreMatrixSelection model={model} selectedCellKey={selectedCellKey} />
    </div>
  );
}
