import type { WorkerStatus } from "../app/workerState";

export type HeaderProps = Readonly<{
  status: WorkerStatus;
  subtitle: string;
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

export function Header({ status, subtitle, activeView }: HeaderProps) {
  const copy = statusCopy(status);
  const isError = status.type === "error";
  return (
    <header className="architecture-header">
      <div className="brand-lockup">
        <a className="brand-lockup__title" href="#/">
          Transformer Viz
        </a>
        <p>{subtitle}</p>
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
      >
        <span id="status" className="status-badge" data-status={status.type}>
          {copy.label}
        </span>
        <span className="lifecycle-detail">{copy.detail}</span>
      </div>
    </header>
  );
}
