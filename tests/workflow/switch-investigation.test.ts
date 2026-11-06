import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { eq } from "drizzle-orm";
import { getSwitchConfig } from "../../src/config/switch";
import { createDatabase } from "../../src/db/client";
import { migrateDatabase } from "../../src/db/migrate";
import { approvals, auditEvents, executions, switchInvestigationJobs } from "../../src/db/schema";
import { IncidentService } from "../../src/server/incidents/service";
import { SwitchTransportError, type SwitchBridgeTransport } from "../../src/server/switch/bridge-client";
import { SwitchInvestigationWorkerService } from "../../src/server/switch/investigation-service";

const resources: Array<{ client: ReturnType<typeof createDatabase>["client"]; directory: string }> = [];
async function setup() { const directory = await mkdtemp(path.join(tmpdir(), "fixflow-switch-")); const url = `file:${path.join(directory, "switch.db")}`; await migrateDatabase(url); const database = createDatabase(url); await database.ready; resources.push({ client: database.client, directory }); return { database, service: new IncidentService(database.db) }; }
afterEach(async () => { const done = resources.splice(0); for (const item of done) item.client.close(); await Promise.all(done.map((item) => rm(item.directory, { recursive: true, force: true }))); });

class FakeTransport implements SwitchBridgeTransport {
  sends = 0; events: unknown[] = []; failure: Error | null = null;
  async sendMessage() { this.sends += 1; if (this.failure) throw this.failure; return { eventId: "switch-event-1" }; }
  async pollRoomEvents() { return this.events as never[]; }
}
async function queued() { const { database, service } = await setup(); const incident = await service.create({ title: "Bridge check", description: "Investigate safely", severity: "HIGH" }); const result = await service.queueSwitchInvestigation(incident.id, { expectedVersion: incident.version }, { requestId: "123e4567-e89b-12d3-a456-426614174000", expectedRoomId: "room-1", expectedSenderId: "agent-target", deadlineAt: new Date(Date.now() + 60_000) }); return { database, result, incident }; }
function reply(requestId = "123e4567-e89b-12d3-a456-426614174000", sender = "agent-target", room = "room-1", messageId = "reply-1") { return { type: "message", room_id: room, payload: { sender, sender_kind: "agent", message_id: messageId, body: `FIXFLOW_RESULT\n${JSON.stringify({ requestId, summary: "Candidate", findings: "Evidence requires human review.", proposedResolution: "Proposed bounded action." })}` } }; }

test("fails closed when Switch is disabled or incomplete", () => {
  assert.deepEqual(getSwitchConfig({}), { enabled: false });
  assert.deepEqual(getSwitchConfig({ SWITCH_ENABLED: "true" }), { enabled: false });
});

test("queues transactionally, audits, dispatches once, and isolates the untrusted candidate", async () => {
  const { database, result, incident } = await queued(); const transport = new FakeTransport(); const worker = new SwitchInvestigationWorkerService(database.db, transport, "worker-a");
  await assert.rejects(new IncidentService(database.db).queueSwitchInvestigation(incident.id, { expectedVersion: result.incident.version }, { requestId: "123e4567-e89b-12d3-a456-426614174001", expectedRoomId: "room-1", expectedSenderId: "agent-target", deadlineAt: new Date(Date.now() + 60_000) }));
  await worker.dispatchOne(); await worker.dispatchOne(); assert.equal(transport.sends, 1);
  transport.events = [reply()]; await worker.pollOnce();
  const [job] = await database.db.select().from(switchInvestigationJobs); assert.equal(job.status, "RESPONSE_RECEIVED"); assert.match(job.candidateJson ?? "", /Evidence requires human review/);
  assert.equal((await database.db.select().from(approvals)).length, 0); assert.equal((await database.db.select().from(executions)).length, 0);
  const history = await database.db.select().from(auditEvents).where(eq(auditEvents.incidentId, incident.id)); assert.ok(history.some((event) => event.eventType === "SWITCH_INVESTIGATION_QUEUED")); assert.ok(history.some((event) => event.eventType === "SWITCH_INVESTIGATION_RESPONSE_RECEIVED"));
  assert.equal(result.incident.status, "INVESTIGATING");
});

test("records definite authentication failure but preserves uncertain delivery without resend", async () => {
  const first = await queued(); const auth = new FakeTransport(); auth.failure = new SwitchTransportError("AUTH", false, "Switch request was refused (401)."); const authWorker = new SwitchInvestigationWorkerService(first.database.db, auth); await authWorker.dispatchOne();
  assert.equal((await first.database.db.select().from(switchInvestigationJobs))[0].status, "FAILED");
  const second = await queued(); const timeout = new FakeTransport(); timeout.failure = new SwitchTransportError("TIMEOUT", true, "Switch request timed out."); const timeoutWorker = new SwitchInvestigationWorkerService(second.database.db, timeout); await timeoutWorker.dispatchOne(); await timeoutWorker.dispatchOne();
  assert.equal((await second.database.db.select().from(switchInvestigationJobs))[0].status, "DELIVERY_UNKNOWN"); assert.equal(timeout.sends, 1);
});

test("rejects wrong, malformed, duplicate, and late replies without workflow side effects", async () => {
  const { database } = await queued(); const transport = new FakeTransport(); const worker = new SwitchInvestigationWorkerService(database.db, transport); await worker.dispatchOne();
  transport.events = [reply(undefined, "unexpected-agent"), reply("123e4567-e89b-12d3-a456-426614174099"), { type: "message", room_id: "room-1", payload: { sender: "agent-target", sender_kind: "agent", message_id: "bad", body: "FIXFLOW_RESULT\nnot-json" } }, { type: "message", room_id: "room-1", payload: { sender: "agent-target", sender_kind: "agent", message_id: "large", body: "x".repeat(14_001) } }]; await worker.pollOnce();
  assert.equal((await database.db.select().from(switchInvestigationJobs))[0].status, "SENT");
  transport.events = [reply()]; await worker.pollOnce(); transport.events = [reply(undefined, "agent-target", "room-1", "reply-2")]; await worker.pollOnce();
  assert.equal((await database.db.select().from(switchInvestigationJobs))[0].status, "RESPONSE_RECEIVED");
  const history = await database.db.select().from(auditEvents); assert.ok(history.some((event) => event.eventType === "SWITCH_INVESTIGATION_RESPONSE_REJECTED")); assert.ok(history.some((event) => event.eventType === "SWITCH_INVESTIGATION_DUPLICATE_OR_LATE_RESPONSE"));
});

test("expires a pending job with no fabricated findings", async () => {
  const { database } = await queued(); const worker = new SwitchInvestigationWorkerService(database.db, new FakeTransport()); await database.db.update(switchInvestigationJobs).set({ deadlineAt: new Date(Date.now() - 1) }); await worker.expire(); const [job] = await database.db.select().from(switchInvestigationJobs); assert.equal(job.status, "TIMED_OUT"); assert.equal(job.candidateJson, null);
});
