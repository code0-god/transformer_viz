import type { WorkerStatus } from "../app/workerState";

export type HeaderProps = Readonly<{
  status: WorkerStatus;
  subtitle: string;
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

export function Header({ status, subtitle }: HeaderProps) {
  const copy = statusCopy(status);
  const isError = status.type === "error";
  return (
    <header className="architecture-header">
      <div className="brand-lockup">
        <h1>Transformer Viz</h1>
        <p>{subtitle}</p>
      </div>
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
