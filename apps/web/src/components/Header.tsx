import type { WorkerStatus } from "../app/workerState";

export type HeaderProps = Readonly<{
  status: WorkerStatus;
  activeView: "learn" | "lab";
}>;

function statusCopy(
  status: WorkerStatus,
): Readonly<{ label: string; detail: string }> {
  switch (status.type) {
    case "loading":
      return { label: "Model Loading", detail: status.phase };
    case "ready":
      return { label: "Model Ready", detail: "Ready to generate" };
    case "running":
      return { label: "Generating", detail: status.detail };
    case "complete":
      return { label: "Model Ready", detail: "Generation complete" };
    case "error":
      return { label: "Model Error", detail: status.message };
  }
}

export function Header({ status, activeView }: HeaderProps) {
  const copy = statusCopy(status);
  const isError = status.type === "error";
  return (
    <header className="architecture-header">
      <div className="brand-lockup">
        <a className="brand-lockup__title" href="#/">
          Transformer Viz
        </a>
      </div>
      <nav className="app-navigation" aria-label="주요 탐색">
        <a href="#/" aria-current={activeView === "learn" ? "page" : undefined}>
          학습
        </a>
        <a
          href="#/lab"
          aria-current={activeView === "lab" ? "page" : undefined}
        >
          모델 실험실
        </a>
      </nav>
      <div
        className={isError ? "lifecycle lifecycle-error" : "lifecycle"}
        role={isError ? "alert" : "status"}
        aria-live={isError ? "assertive" : "polite"}
        aria-describedby={isError ? "lifecycle-error-detail" : undefined}
      >
        <span id="status" className="status-badge" data-status={status.type}>
          {copy.label}
        </span>
        {isError ? (
          <span id="lifecycle-error-detail" className="lifecycle-detail">
            {copy.detail}
          </span>
        ) : null}
      </div>
    </header>
  );
}
