import type { ReactElement } from "react";

import type { ScoreMatrixModel } from "../scoreMatrixModel";
import {
  buildScoreMatrixGeometry,
  type ScoreMatrixCellKey,
} from "./scoreMatrixGeometry";

type ScoreMatrixLegendProps = Readonly<{
  model: ScoreMatrixModel;
  selectedCellKey: ScoreMatrixCellKey | null;
}>;

export function ScoreMatrixLegend({
  model,
  selectedCellKey,
}: ScoreMatrixLegendProps): ReactElement {
  const geometry = buildScoreMatrixGeometry(model, selectedCellKey);

  return (
    <section
      className="score-matrix-legend-region"
      aria-label="Score Matrix legend and orientation"
    >
      <p className="score-matrix-orientation">
        Key 가로축 · Query 깊이축 · 0 plane 기준 signed height
      </p>
      <div className="score-matrix-legend-panel">
        <span className="score-matrix-legend-scale" aria-hidden="true" />
        <ul className="score-matrix-legend" aria-label="점수 범례">
          {geometry.legend.map((entry) => (
            <li key={entry.tone}>
              <span
                className="score-matrix-legend-swatch"
                data-tone={entry.tone}
                aria-hidden="true"
              />
              <span>
                {entry.tone}: {entry.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
