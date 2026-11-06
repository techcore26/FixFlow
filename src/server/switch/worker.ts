import { getSwitchConfig } from "@/config/switch";
import { getDatabase } from "@/db/client";
import { createSwitchBridgeTransport } from "./bridge-client";
import { SwitchInvestigationWorkerService } from "./investigation-service";

async function main() {
  const config = getSwitchConfig();
  if (!config.enabled) throw new Error("Switch worker is disabled: configure SWITCH_ENABLED=true and all server-only Switch values.");
  const database = getDatabase(); await database.ready;
  const worker = new SwitchInvestigationWorkerService(database.db, createSwitchBridgeTransport(config));
  let stopping = false; const stop = () => { stopping = true; }; process.once("SIGINT", stop); process.once("SIGTERM", stop);
  while (!stopping) { await worker.expire(); await worker.dispatchOne(); await worker.pollOnce(); }
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Switch worker failed."); process.exitCode = 1; });
