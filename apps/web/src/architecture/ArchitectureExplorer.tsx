import type { ModelMetadata } from "../generated/schema";
import { resolveLearningTrack } from "../tracks/registry";
import { UnsupportedLearningProfile } from "../tracks/UnsupportedLearningProfile";
import type { ArchitectureAction, ArchitectureState } from "./state";

export interface ArchitectureExplorerProps {
  readonly model: Readonly<ModelMetadata> | null;
  readonly state: ArchitectureState;
  readonly replaySequenceLength: number | null;
  readonly navigate: (action: ArchitectureAction) => void;
}

export function ArchitectureExplorer({
  model,
  state,
  replaySequenceLength,
  navigate,
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
  const resolution = resolveLearningTrack(model);
  if (resolution.status === "unsupported") {
    return <UnsupportedLearningProfile resolution={resolution} />;
  }

  return (
    <section
      className="architecture-shell"
      data-learning-track-id={resolution.adapter.profile.id}
    >
      {resolution.adapter.renderArchitecture({
        model,
        state,
        replaySequenceLength,
        navigate,
      })}
    </section>
  );
}
