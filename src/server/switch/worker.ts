import { SwitchTransportError } from "./bridge-client";
import type { SwitchInvestigationWorkerService } from "./investigation-service";

type WorkerOperations = Pick<
  SwitchInvestigationWorkerService,
  "expire" | "dispatchOne" | "pollOnce"
>;

function waitForRetry(
  milliseconds: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };

    const timer = setTimeout(finish, milliseconds);

    signal.addEventListener("abort", finish, { once: true });

    if (signal.aborted) finish();
  });
}

export async function runSwitchWorker(
  worker: WorkerOperations,
  signal: AbortSignal,
  wait: (milliseconds: number, signal: AbortSignal) => Promise<void> =
    waitForRetry,
): Promise<void> {
  let consecutiveFailures = 0;

  while (!signal.aborted) {
    try {
      await worker.expire();
      if (signal.aborted) break;

      await worker.dispatchOne();
      if (signal.aborted) break;

      await worker.pollOnce();
      consecutiveFailures = 0;
    } catch (error) {
      if (
        !(error instanceof SwitchTransportError) ||
        error.code === "AUTH"
      ) {
        throw error;
      }

      consecutiveFailures += 1;

      const delayMs = Math.min(
        30_000,
        1_000 * 2 ** Math.min(consecutiveFailures - 1, 5),
      );

      console.error(
        `Switch transport ${error.code}; retrying in ${delayMs}ms (failure ${consecutiveFailures}).`,
      );

      if (signal.aborted) break;

      await wait(delayMs, signal);
    }
  }
}
