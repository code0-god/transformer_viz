import {
  createContext,
  type Dispatch,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type { ArchitectureAction } from "../architecture";
import type { GenerationConfig, WorkerResponse } from "../generated/schema";
import type { WorkerClient, WorkerTransport } from "../worker/WorkerClient";
import {
  type CleanupScheduler,
  createWorkerLifecycle,
} from "../worker/workerLifecycle";
import {
  type AppAction,
  type AppState,
  acceptsTokenResponse,
  appReducer,
  createAppState,
} from "./appReducer";

export interface AppCommands {
  readonly generate: (prompt: string, config: GenerationConfig) => void;
  readonly stop: () => void;
  readonly replayStep: (stepIndex: number) => void;
  readonly navigateArchitecture: (action: ArchitectureAction) => void;
}

interface AppContextValue {
  readonly state: AppState;
  readonly dispatch: Dispatch<AppAction>;
  readonly commands: AppCommands;
}

export interface AppProviderProps {
  readonly children: ReactNode;
  readonly createWorker: () => WorkerTransport;
  readonly manifestUrl: string;
  readonly scheduler?: CleanupScheduler;
}

const AppContext = createContext<AppContextValue | null>(null);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Worker command failed";
}

export function AppProvider({
  children,
  createWorker,
  manifestUrl,
  scheduler,
}: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, undefined, createAppState);
  const stateRef = useRef(state);
  const clientRef = useRef<WorkerClient | null>(null);
  stateRef.current = state;

  const reportError = useCallback((error: unknown) => {
    dispatch({ type: "client-error", message: errorMessage(error) });
  }, []);

  const onResponse = useCallback(
    (response: WorkerResponse) => {
      const generation = stateRef.current.generation;
      const grantCredit =
        response.type === "token_generated" &&
        acceptsTokenResponse(generation, response);
      dispatch({ type: "worker-response", response });
      if (!grantCredit || response.type !== "token_generated") return;
      try {
        clientRef.current?.continueGeneration(
          response.request_id,
          response.run_id,
          response.step.index,
        );
      } catch (error: unknown) {
        reportError(error);
      }
    },
    [reportError],
  );

  const lifecycle = useMemo(
    () =>
      createWorkerLifecycle({
        createWorker,
        manifestUrl,
        onError: reportError,
        onResponse,
        onRejected: () => dispatch({ type: "worker-payload-rejected" }),
        ...(scheduler === undefined ? {} : { scheduler }),
      }),
    [createWorker, manifestUrl, onResponse, reportError, scheduler],
  );

  useEffect(() => {
    let acquired = false;
    try {
      clientRef.current = lifecycle.acquire();
      acquired = true;
    } catch (error: unknown) {
      reportError(error);
    }
    return () => {
      clientRef.current = null;
      if (acquired) lifecycle.release();
    };
  }, [lifecycle, reportError]);

  const generate = useCallback(
    (prompt: string, config: GenerationConfig) => {
      try {
        const client = clientRef.current;
        if (client === null) throw new Error("Model Worker is not ready");
        const requestId = client.generate(prompt, config);
        dispatch({ type: "generation-requested", requestId, prompt, config });
      } catch (error: unknown) {
        reportError(error);
      }
    },
    [reportError],
  );

  const stop = useCallback(() => {
    const active = stateRef.current.generation.active;
    if (active === null) return;
    try {
      const client = clientRef.current;
      if (client === null) throw new Error("Model Worker is not ready");
      client.stopGeneration(active.requestId.value, active.runId.value);
    } catch (error: unknown) {
      reportError(error);
    }
  }, [reportError]);

  const replayStep = useCallback(
    (stepIndex: number) => {
      const generation = stateRef.current.generation;
      if (
        generation.active === null ||
        generation.steps[stepIndex] === undefined
      )
        return;
      try {
        const client = clientRef.current;
        if (client === null) throw new Error("Model Worker is not ready");
        const requestId = client.inspectGenerationStep(
          generation.active.runId.value,
          stepIndex,
        );
        dispatch({ type: "replay-requested", requestId, stepIndex });
      } catch (error: unknown) {
        reportError(error);
      }
    },
    [reportError],
  );

  const navigateArchitecture = useCallback((action: ArchitectureAction) => {
    dispatch({ type: "architecture", action });
  }, []);

  const commands = useMemo<AppCommands>(
    () => ({ generate, stop, replayStep, navigateArchitecture }),
    [generate, navigateArchitecture, replayStep, stop],
  );
  const value = useMemo(
    () => ({ state, dispatch, commands }),
    [commands, state],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const value = useContext(AppContext);
  if (value === null) throw new Error("useAppContext requires AppProvider");
  return value;
}
