import { type ReactElement, useLayoutEffect, useState } from "react";
import { AppProvider, useAppContext } from "./app/AppContext";
import {
  defaultGenerationForm,
  type GenerationForm,
} from "./app/generationState";
import { ArchitectureExplorer } from "./architecture";
import { ContinuationPanel } from "./components/ContinuationPanel";
import { Header } from "./components/Header";
import { PromptPanel } from "./components/PromptPanel";
import { resolveLearningTrack } from "./tracks/registry";
import { createInferenceWorker } from "./worker/createWorker";
import type { WorkerTransport } from "./worker/WorkerClient";
import type { CleanupScheduler } from "./worker/workerLifecycle";

export interface AppProps {
  readonly createWorker?: () => WorkerTransport;
  readonly manifestUrl?: string;
  readonly cleanupScheduler?: CleanupScheduler;
}

export function modelManifestUrl(
  baseUrl = import.meta.env.BASE_URL,
  origin = window.location.origin,
): string {
  return new URL(`${baseUrl}models/edu/manifest.json`, `${origin}/`).href;
}

function AppSurface(): ReactElement {
  const { state, commands } = useAppContext();
  const [prompt, setPrompt] = useState("the cat");
  const [form, setForm] = useState<GenerationForm>(defaultGenerationForm);
  const config = state.worker.model?.config;
  const track =
    state.worker.model === null
      ? null
      : resolveLearningTrack(state.worker.model);
  const headerSubtitle =
    track?.status === "supported"
      ? track.adapter.profile.subtitle
      : "Transformer 학습 과정을 탐색합니다.";
  const replaySequenceLength =
    state.generation.replaySummary?.tokens.length ?? null;

  useLayoutEffect(() => {
    document.getElementById("startup-shell")?.remove();
  }, []);

  return (
    <>
      <a className="skip-link" href="#architecture-main">
        Architecture로 건너뛰기
      </a>
      <div className="architecture-app">
        <Header status={state.worker.status} subtitle={headerSubtitle} />
        <main id="architecture-main" className="architecture-main">
          <PromptPanel
            prompt={prompt}
            form={form}
            limits={{
              blockSize: config?.block_size ?? 1,
              vocabSize: config?.vocab_size ?? 1,
            }}
            generation={state.generation}
            disabled={state.worker.model === null}
            onPromptChange={setPrompt}
            onFormChange={setForm}
            onGenerate={commands.generate}
            onStop={commands.stop}
          />
          <ContinuationPanel
            generation={state.generation}
            onSelectStep={commands.replayStep}
          />
          <ArchitectureExplorer
            model={state.worker.model}
            state={state.architecture}
            replaySequenceLength={replaySequenceLength}
            navigate={commands.navigateArchitecture}
          />
        </main>
      </div>
    </>
  );
}

export function App({
  createWorker = createInferenceWorker,
  manifestUrl = modelManifestUrl(),
  cleanupScheduler,
}: AppProps): ReactElement {
  return (
    <AppProvider
      createWorker={createWorker}
      manifestUrl={manifestUrl}
      {...(cleanupScheduler === undefined
        ? {}
        : { scheduler: cleanupScheduler })}
    >
      <AppSurface />
    </AppProvider>
  );
}
