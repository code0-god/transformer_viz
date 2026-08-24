import type { ReactElement } from "react";
import type { LearningTrackResolution } from "./types";

interface UnsupportedLearningProfileProps {
  readonly resolution: Extract<
    LearningTrackResolution,
    { status: "unsupported" }
  >;
}

export function UnsupportedLearningProfile({
  resolution,
}: UnsupportedLearningProfileProps): ReactElement {
  return (
    <section
      className="architecture-shell architecture-error"
      data-testid="unsupported-learning-profile"
      role="alert"
    >
      <h2>이 모델의 학습 프로필을 찾을 수 없습니다.</h2>
      <dl>
        <div>
          <dt>Model</dt>
          <dd>{resolution.model.model_id}</dd>
        </div>
        <div>
          <dt>Architecture</dt>
          <dd>{resolution.model.architecture.architecture_id}</dd>
        </div>
      </dl>
      <p>지원되는 학습 트랙: {resolution.supportedTracks.join(", ")}</p>
    </section>
  );
}
