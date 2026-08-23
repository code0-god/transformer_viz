export interface WorkerBootstrapScope {
  readonly onmessage: ((event: MessageEvent<unknown>) => void) | null;
  addMessageListener(listener: (event: MessageEvent<unknown>) => void): void;
  removeMessageListener(listener: (event: MessageEvent<unknown>) => void): void;
}

export async function initializeWorkerRuntime(
  scope: WorkerBootstrapScope,
  initialize: () => Promise<unknown>,
): Promise<void> {
  const queuedMessages: MessageEvent<unknown>[] = [];
  const queueMessage = (event: MessageEvent<unknown>) => {
    queuedMessages.push(event);
  };
  scope.addMessageListener(queueMessage);
  try {
    await initialize();
  } finally {
    scope.removeMessageListener(queueMessage);
  }

  const handler = scope.onmessage;
  if (handler === null) {
    throw new Error("Rust Worker initialized without a message handler");
  }
  for (const event of queuedMessages) handler(event);
}
