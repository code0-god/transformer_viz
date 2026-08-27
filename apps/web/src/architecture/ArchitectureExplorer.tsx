import type { ModelMetadata, RunSummary } from "../generated/schema";
import {
  resolveLearningTrack,
  resolveLearningTrackById,
} from "../tracks/registry";
import type { LearningCourseLocation } from "../tracks/types";
import { UnsupportedLearningProfile } from "../tracks/UnsupportedLearningProfile";
import type { ScoreMatrixInspectionState } from "../tracks/visualization/scoreMatrixState";
import { createScoreMatrixInspectionState } from "../tracks/visualization/scoreMatrixState";
import type { ArchitectureAction, ArchitectureState } from "./state";

export interface ArchitectureExplorerProps {
  readonly model: Readonly<ModelMetadata> | null;
  readonly state: ArchitectureState;
  readonly replaySequenceLength: number | null;
  readonly replaySummary?: Readonly<RunSummary> | null;
  readonly scoreMatrix?: ScoreMatrixInspectionState;
  readonly inspectScoreMatrix?: () => void;
  readonly navigate: (action: ArchitectureAction) => void;
  readonly course?: LearningCourseLocation;
}

export function ArchitectureExplorer({
  model,
  state,
  replaySequenceLength,
  replaySummary = null,
  scoreMatrix = createScoreMatrixInspectionState(),
  inspectScoreMatrix = () => undefined,
  navigate,
  course,
}: ArchitectureExplorerProps) {
  if (model === null) {
    return (
      <section
        className="architecture-shell architecture-loading"
        aria-live="polite"
      >
        <span className="architecture-loading-mark" aria-hidden="true" />
        <p>학습용 모델 구조를 불러오고 있습니다.</p>
      </section>
    );
  }
  const resolution =
    course === undefined
      ? resolveLearningTrack(model)
      : resolveLearningTrackById(course.trackId, model);
  if (resolution.status === "unsupported") {
    return <UnsupportedLearningProfile resolution={resolution} />;
  }

  const context =
    course === undefined
      ? {
          model,
          state,
          replaySequenceLength,
          replaySummary,
          scoreMatrix,
          inspectScoreMatrix,
          navigate,
        }
      : {
          model,
          state,
          replaySequenceLength,
          replaySummary,
          scoreMatrix,
          inspectScoreMatrix,
          navigate,
          course,
        };

  return (
    <section
      className="architecture-shell"
      data-learning-track-id={resolution.adapter.profile.id}
    >
      {resolution.adapter.renderArchitecture(context)}
    </section>
  );
}
