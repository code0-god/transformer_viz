import type { ModelMetadata } from "../generated/schema";
import { decoderOnlyFundamentalsRegistration } from "./decoder-only-fundamentals";
import type {
  LearningTrackId,
  LearningTrackRegistration,
  LearningTrackResolution,
} from "./types";
import {
  LearningProfileValidationError,
  validateLearningProfile,
} from "./validation";

export type LearningTrackRegistryErrorCode =
  | "duplicate-track-id"
  | "duplicate-architecture-id";

export class LearningTrackRegistryError extends Error {
  constructor(
    readonly code: LearningTrackRegistryErrorCode,
    readonly key: string,
  ) {
    super(`${code}: ${key}`);
    this.name = "LearningTrackRegistryError";
  }
}

export interface LearningTrackRegistry {
  readonly registrations: readonly LearningTrackRegistration[];
  readonly byTrackId: ReadonlyMap<LearningTrackId, LearningTrackRegistration>;
  readonly byArchitectureId: ReadonlyMap<string, LearningTrackRegistration>;
}

export function createLearningTrackRegistry(
  registrations: readonly LearningTrackRegistration[],
): LearningTrackRegistry {
  const byTrackId = new Map<LearningTrackId, LearningTrackRegistration>();
  const byArchitectureId = new Map<string, LearningTrackRegistration>();
  for (const registration of registrations) {
    const issues = validateLearningProfile(registration.profile);
    if (issues.length > 0) throw new LearningProfileValidationError(issues);
    if (byTrackId.has(registration.profile.id)) {
      throw new LearningTrackRegistryError(
        "duplicate-track-id",
        registration.profile.id,
      );
    }
    byTrackId.set(registration.profile.id, registration);
    for (const architectureId of registration.profile
      .compatibleArchitectureIds) {
      if (byArchitectureId.has(architectureId)) {
        throw new LearningTrackRegistryError(
          "duplicate-architecture-id",
          architectureId,
        );
      }
      byArchitectureId.set(architectureId, registration);
    }
  }
  return { registrations, byTrackId, byArchitectureId };
}

export const learningTrackRegistry = createLearningTrackRegistry([
  decoderOnlyFundamentalsRegistration,
]);

export function resolveLearningTrack(
  model: Readonly<ModelMetadata>,
  registry = learningTrackRegistry,
): LearningTrackResolution {
  const registration = registry.byArchitectureId.get(
    model.architecture.architecture_id,
  );
  const supportedTracks = registry.registrations.map(
    ({ profile }) => profile.title,
  );
  if (registration === undefined) {
    return {
      status: "unsupported",
      reason: "unknown-architecture",
      model,
      supportedTracks,
    };
  }
  if (
    registration.profile.compatibleModelIds !== undefined &&
    !registration.profile.compatibleModelIds.includes(model.model_id)
  ) {
    return {
      status: "unsupported",
      reason: "incompatible-model",
      model,
      supportedTracks,
    };
  }
  const adapter = registration.createAdapter();
  return adapter.supportsModel(model)
    ? { status: "supported", adapter }
    : {
        status: "unsupported",
        reason: "incompatible-architecture",
        model,
        supportedTracks,
      };
}

export function resolveLearningTrackById(
  trackId: LearningTrackId,
  model: Readonly<ModelMetadata>,
  registry = learningTrackRegistry,
): LearningTrackResolution {
  const registration = registry.byTrackId.get(trackId);
  const supportedTracks = registry.registrations.map(
    ({ profile }) => profile.title,
  );
  if (registration === undefined) {
    return {
      status: "unsupported",
      reason: "unknown-architecture",
      model,
      supportedTracks,
    };
  }
  if (
    !registration.profile.compatibleArchitectureIds.includes(
      model.architecture.architecture_id,
    )
  ) {
    return {
      status: "unsupported",
      reason: "incompatible-architecture",
      model,
      supportedTracks,
    };
  }
  if (
    registration.profile.compatibleModelIds !== undefined &&
    !registration.profile.compatibleModelIds.includes(model.model_id)
  ) {
    return {
      status: "unsupported",
      reason: "incompatible-model",
      model,
      supportedTracks,
    };
  }
  const adapter = registration.createAdapter();
  return adapter.supportsModel(model)
    ? { status: "supported", adapter }
    : {
        status: "unsupported",
        reason: "incompatible-architecture",
        model,
        supportedTracks,
      };
}
