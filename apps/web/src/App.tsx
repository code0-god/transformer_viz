import { type ReactElement, useLayoutEffect, useState } from "react";
import { AppProvider, useAppContext } from "./app/AppContext";
import { chapterHref, useAppRoute } from "./app/appRoute";
import {
  defaultGenerationForm,
  type GenerationForm,
} from "./app/generationState";
import { modelManifestUrl } from "./app/modelManifestUrl";
import { ArchitectureExplorer } from "./architecture/ArchitectureExplorer";
import { ContinuationPanel } from "./components/ContinuationPanel";
import { CourseHome } from "./components/CourseHome";
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

function AppSurface(): ReactElement {
  const { state, commands } = useAppContext();
  const route = useAppRoute();
  const [prompt, setPrompt] = useState("the cat");
  const [form, setForm] = useState<GenerationForm>(defaultGenerationForm);
  const config = state.worker.model?.config;
  const track =
    state.worker.model === null
      ? null
      : resolveLearningTrack(state.worker.model);
  const headerSubtitle =
    route.view === "lab"
      ? "미리 학습된 nanoGPT 모델의 추론 과정을 직접 실행합니다."
      : track?.status === "supported"
        ? track.adapter.profile.subtitle
        : "Transformer의 기본 개념부터 단계적으로 학습합니다.";
  const replaySequenceLength =
    state.generation.replaySummary?.tokens.length ?? null;

  useLayoutEffect(() => {
    document.getElementById("startup-shell")?.remove();
  }, []);

  return (
    <>
      <a className="skip-link" href="#architecture-main">
        본문으로 건너뛰기
      </a>
      <div
        className="architecture-app"
        data-app-view={route.view === "chapter" ? "learn" : route.view}
      >
        <Header
          status={state.worker.status}
          subtitle={headerSubtitle}
          activeView={route.view === "lab" ? "lab" : "learn"}
        />
        <main id="architecture-main" className="architecture-main">
          {route.view === "home" ? <CourseHome /> : null}
          {route.view === "lab" ? (
            <>
              <section className="lab-introduction">
                <p className="lab-introduction__eyebrow">LAB / NANO GPT</p>
                <h1>모델 실험실</h1>
                <p>
                  Prompt와 생성 설정을 바꾸며 기존 추론·재생 흐름을 확인합니다.
                </p>
              </section>
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
            </>
          ) : null}
          {route.view === "chapter" ? (
            <ArchitectureExplorer
              model={state.worker.model}
              state={state.architecture}
              replaySequenceLength={replaySequenceLength}
              navigate={commands.navigateArchitecture}
              course={{
                trackId: route.trackId,
                chapterId: route.chapterId,
                homeHref: "#/",
                chapterHref: (chapterId) =>
                  chapterHref(route.trackId, chapterId),
                navigateChapter: (chapterId) => {
                  window.location.hash = chapterHref(route.trackId, chapterId);
                },
              }}
            />
          ) : null}
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
