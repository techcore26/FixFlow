import { getSwitchConfig } from "@/config/switch";
import { getDatabase } from "@/db/client";
import { createSwitchBridgeTransport } from "./bridge-client";
import { SwitchInvestigationWorkerService } from "./investigation-service";
import { runSwitchWorker } from "./worker";

async function main() {
  const config = getSwitchConfig();

  if (!config.enabled) {
    throw new Error("Switch worker is disabled: configure SWITCH_ENABLED=true and all server-only Switch values.");
  }

  const database = getDatabase();
  await database.ready;

  const worker = new SwitchInvestigationWorkerService(
    database.db,
    createSwitchBridgeTransport(config),
  );

  const controller = new AbortController();
  const stop = () => controller.abort();

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  try {
    await runSwitchWorker(worker, controller.signal);
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Switch worker failed.");
  process.exitCode = 1;
});
