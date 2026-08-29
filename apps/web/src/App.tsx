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
import { LabInspectionPanel } from "./components/LabInspectionPanel";
import { PageDivider } from "./layout/PageLayout";
import "./components/LabResults.css";
import "./components/LabWorkspace.css";
import { PromptPanel } from "./components/PromptPanel";
import { FocusedViewerProvider } from "./overlays/FocusedViewerContext";
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
  const replaySequenceLength =
    state.generation.replaySummary?.tokens.length ?? null;
  const labStatus =
    state.worker.status.type === "ready" ||
    state.worker.status.type === "complete"
      ? "Ready"
      : state.worker.status.type === "error"
        ? "Error"
        : state.worker.status.type === "running"
          ? "Generating"
          : "Loading";

  useLayoutEffect(() => {
    document.getElementById("startup-shell")?.remove();
  }, []);

  return (
    <>
      <a className="skip-link" href="#architecture-main">
        본문으로 건너뛰기
      </a>
      <div
        className="architecture-app page-layout"
        data-app-view={route.view === "chapter" ? "learn" : route.view}
      >
        <Header
          status={state.worker.status}
          activeView={route.view === "lab" ? "lab" : "learn"}
        />
        <main
          id="architecture-main"
          className="architecture-main page-layout__full page-layout__subgrid"
        >
          {route.view === "home" ? <CourseHome /> : null}
          {route.view === "lab" ? (
            <section
              className="lab-workspace page-layout__full page-layout"
              data-threeui-surface="lab"
              data-lab-layout="instrument-stack"
              aria-labelledby="lab-title"
            >
              <header
                className="lab-introduction page-layout__wide"
                data-threeui-surface="lab-header"
              >
                <div className="lab-introduction__identity">
                  <h1 id="lab-title" aria-label="모델 실험실">
                    MODEL LAB
                  </h1>
                  <p>nanoGPT Educational Model</p>
                </div>
                <p
                  className="lab-introduction__status"
                  data-status={state.worker.status.type}
                >
                  <span aria-hidden="true" />
                  {labStatus}
                </p>
              </header>
              <PageDivider boundaryId="lab-prompt" />
              <div className="lab-experiment-grid page-layout__full page-layout__subgrid">
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
                <PageDivider boundaryId="lab-output" />
                <ContinuationPanel
                  generation={state.generation}
                  onSelectStep={commands.replayStep}
                />
                <PageDivider boundaryId="lab-inspect" />
              </div>
              <LabInspectionPanel />
            </section>
          ) : null}
          {route.view === "chapter" ? (
            <ArchitectureExplorer
              model={state.worker.model}
              state={state.architecture}
              replaySequenceLength={replaySequenceLength}
              replaySummary={state.generation.replaySummary}
              scoreMatrix={state.scoreMatrix}
              inspectScoreMatrix={commands.inspectScoreMatrix}
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
      <FocusedViewerProvider>
        <AppSurface />
      </FocusedViewerProvider>
    </AppProvider>
  );
}
