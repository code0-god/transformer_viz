import type { WorkerStatus } from "../app/workerState";
import "./Header.css";

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
    <header className="architecture-header" data-threeui-surface="shell">
      <div className="brand-lockup">
        <a
          className="brand-lockup__title"
          data-threeui-control="brand"
          href="#/"
          aria-label="Transformer Viz"
        >
          <span>Transformer</span>
          <span className="brand-lockup__viz">Viz</span>
        </a>
      </div>
      <nav
        className="app-navigation"
        aria-label="주요 탐색"
        data-threeui-control="mode-navigation"
      >
        <a
          href="#/"
          aria-current={activeView === "learn" ? "page" : undefined}
          data-control-state={activeView === "learn" ? "selected" : "idle"}
        >
          학습
        </a>
        <a
          href="#/lab"
          aria-current={activeView === "lab" ? "page" : undefined}
          data-control-state={activeView === "lab" ? "selected" : "idle"}
        >
          모델 실험실
        </a>
      </nav>
      <div
        className={isError ? "lifecycle lifecycle-error" : "lifecycle"}
        data-threeui-control="status"
        data-threeui-status={status.type}
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
