import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { eq } from "drizzle-orm";
import { createDatabase } from "../../src/db/client";
import { migrateDatabase } from "../../src/db/migrate";
import { approvals, auditEvents, executions, incidents, investigations } from "../../src/db/schema";
import {
  InvalidTransitionError,
  StaleIncidentVersionError,
} from "../../src/server/incidents/errors";
import { IncidentService } from "../../src/server/incidents/service";

const resources: Array<{
  client: ReturnType<typeof createDatabase>["client"];
  directory: string;
}> = [];

async function createService() {
  const directory = await mkdtemp(path.join(tmpdir(), "fixflow-workflow-"));
  const url = `file:${path.join(directory, "workflow.db")}`;
  await migrateDatabase(url);
  const database = createDatabase(url);
  await database.ready;
  resources.push({ client: database.client, directory });
  return { database, service: new IncidentService(database.db) };
}

async function awaitingApproval(service: IncidentService) {
  const created = await service.create({ title: "API outage", description: "Requests fail", severity: "HIGH" });
  const started = await service.startInvestigation(created.id, { expectedVersion: created.version });
  const ready = await service.recordInvestigationResult(created.id, {
    expectedVersion: started.incident.version,
    investigationId: started.investigation.id,
    outcome: "READY_FOR_APPROVAL",
    findings: "The primary is unavailable",
    proposedResolution: "Promote the standby",
    summary: "Primary unavailable; standby promotion is proposed.",
  });
  return { created, investigation: started.investigation, ready };
}

afterEach(async () => {
  const completed = resources.splice(0);
  for (const resource of completed) resource.client.close();
  await Promise.all(completed.map((resource) => rm(resource.directory, { recursive: true, force: true })));
});

test("preserves a failed attempt when retrying the same aggregate execution", async () => {
  const { service } = await createService();
  const setup = await awaitingApproval(service);
  const approved = await service.approve(setup.created.id, {
    expectedVersion: setup.ready.version,
    investigationId: setup.investigation.id,
    action: { type: "ROLLBACK", summary: "Roll back release", parameters: { release: "v42" } },
  });
  const started = await service.trackExecution(setup.created.id, {
    operation: "START",
    expectedVersion: approved.incident.version,
    approvalId: approved.approval.id,
    idempotencyKey: "incident-rollback-v42",
    requestSummary: "Record rollback attempt",
  });
  const failed = await service.trackExecution(setup.created.id, {
    operation: "FAIL",
    expectedVersion: started.incident.version,
    executionId: started.execution.id,
    errorMessage: "Operator reported failure",
  });
  const retried = await service.trackExecution(setup.created.id, {
    operation: "RETRY",
    expectedVersion: failed.incident.version,
    executionId: failed.execution.id,
  });
  assert.equal(retried.execution.id, started.execution.id);
  assert.equal(retried.execution.idempotencyKey, started.execution.idempotencyKey);
  assert.equal(retried.approvedActionSnapshot, approved.approval.proposedActionSnapshot);

  const resolved = await service.trackExecution(setup.created.id, {
    operation: "SUCCEED",
    expectedVersion: retried.incident.version,
    executionId: retried.execution.id,
    resultSummary: "Operator confirmed rollback",
  });
  const closed = await service.close(setup.created.id, {
    expectedVersion: resolved.incident.version,
    resolutionSummary: "Rollback restored service",
  });
  assert.equal(closed.status, "CLOSED");

  const details = await service.details(setup.created.id);
  assert.equal(details.approvals.length, 1);
  assert.equal(details.executions.length, 1);
  assert.equal(details.executionAttempts.length, 2);
  assert.deepEqual(details.executionAttempts.map(item => [item.attemptNumber, item.status]), [[1, "FAILED"], [2, "SUCCEEDED"]]);
  assert.equal(details.executionAttempts[0]?.errorMessage, "Operator reported failure");
  assert.equal(details.executionAttempts[1]?.resultSummary, "Operator confirmed rollback");
  assert.equal(details.auditEvents.at(-1)?.newStatus, "CLOSED");
  assert.equal(details.investigations[0]?.summary, "Primary unavailable; standby promotion is proposed.");
});

test("preserves every failed attempt across multiple retries", async () => {
  const { service } = await createService();
  const setup = await awaitingApproval(service);
  const approved = await service.approve(setup.created.id, {
    expectedVersion: setup.ready.version,
    investigationId: setup.investigation.id,
    action: { type: "ROLLBACK", summary: "Roll back release", parameters: {} },
  });
  const started = await service.trackExecution(setup.created.id, { operation: "START", expectedVersion: approved.incident.version, approvalId: approved.approval.id, idempotencyKey: "attempt-history-roll-back", requestSummary: "First tracked attempt" });
  const firstFailure = await service.trackExecution(setup.created.id, { operation: "FAIL", expectedVersion: started.incident.version, executionId: started.execution.id, errorMessage: "First attempt failed" });
  const second = await service.trackExecution(setup.created.id, { operation: "RETRY", expectedVersion: firstFailure.incident.version, executionId: started.execution.id, requestSummary: "Second tracked attempt" });
  const secondFailure = await service.trackExecution(setup.created.id, { operation: "FAIL", expectedVersion: second.incident.version, executionId: started.execution.id, errorMessage: "Second attempt failed" });
  const third = await service.trackExecution(setup.created.id, { operation: "RETRY", expectedVersion: secondFailure.incident.version, executionId: started.execution.id, requestSummary: "Third tracked attempt" });
  const details = await service.details(setup.created.id);
  assert.equal(details.executions.length, 1);
  assert.deepEqual(details.executionAttempts.map(item => [item.attemptNumber, item.status, item.requestSummary, item.errorMessage]), [[1, "FAILED", "First tracked attempt", "First attempt failed"], [2, "FAILED", "Second tracked attempt", "Second attempt failed"], [3, "RUNNING", "Third tracked attempt", null]]);
  assert.equal(third.execution.status, "RUNNING");
});

test("persists a separate investigation summary while legacy records remain valid", async () => {
  const { database, service } = await createService();
  const setup = await awaitingApproval(service);
  const [saved] = await database.db.select().from(investigations).where(eq(investigations.id, setup.investigation.id));
  assert.equal(saved.summary, "Primary unavailable; standby promotion is proposed.");

  await database.db.update(investigations).set({ summary: null }).where(eq(investigations.id, setup.investigation.id));
  const details = await service.details(setup.created.id);
  assert.equal(details.investigations[0]?.summary, null);
  assert.equal(details.investigations[0]?.findings, "The primary is unavailable");
  assert.equal(details.investigations[0]?.proposedResolution, "Promote the standby");
});

test("rejects invalid and stale transitions and deduplicates concurrent starts", async () => {
  const { database, service } = await createService();
  const incident = await service.create({ title: "Queue delay", description: "Jobs delayed", severity: "MEDIUM" });
  await assert.rejects(
    service.close(incident.id, { expectedVersion: incident.version, resolutionSummary: "Not resolved" }),
    InvalidTransitionError,
  );

  const results = await Promise.allSettled([
    service.startInvestigation(incident.id, { expectedVersion: incident.version }),
    service.startInvestigation(incident.id, { expectedVersion: incident.version }),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.equal((await database.db.select().from(investigations)).length, 1);

  await assert.rejects(
    service.startInvestigation(incident.id, { expectedVersion: incident.version }),
    StaleIncidentVersionError,
  );
});

test("deduplicates concurrent approvals, executions, and their audit transitions", async () => {
  const { database, service } = await createService();
  const setup = await awaitingApproval(service);
  const approvalInput = {
    expectedVersion: setup.ready.version,
    investigationId: setup.investigation.id,
    action: { type: "RESTART_SERVICE" as const, summary: "Restart through the approved runbook", parameters: {} },
  };
  const approvalResults = await Promise.allSettled([
    service.approve(setup.created.id, approvalInput),
    service.approve(setup.created.id, approvalInput),
  ]);
  assert.equal(approvalResults.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal((await database.db.select().from(approvals)).length, 1);
  const approved = approvalResults.find((result) => result.status === "fulfilled");
  assert.ok(approved && approved.status === "fulfilled");

  const executionInput = {
    operation: "START" as const,
    expectedVersion: approved.value.incident.version,
    approvalId: approved.value.approval.id,
    idempotencyKey: "approved-restart-runbook",
  };
  const executionResults = await Promise.allSettled([
    service.trackExecution(setup.created.id, executionInput),
    service.trackExecution(setup.created.id, executionInput),
  ]);
  assert.equal(executionResults.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal((await database.db.select().from(executions)).length, 1);

  const history = await database.db.select().from(auditEvents);
  assert.equal(history.filter((event) => event.eventType === "RESOLUTION_APPROVED").length, 1);
  assert.equal(history.filter((event) => event.eventType === "EXECUTION_STARTED").length, 1);
});

test("preserves a rejection while allowing a revised investigation", async () => {
  const { database, service } = await createService();
  const setup = await awaitingApproval(service);
  const rejected = await service.reject(setup.created.id, {
    expectedVersion: setup.ready.version,
    investigationId: setup.investigation.id,
    rationale: "Resolution is too risky",
  });
  const revised = await service.startInvestigation(setup.created.id, {
    expectedVersion: rejected.incident.version,
  });

  assert.notEqual(revised.investigation.id, setup.investigation.id);
  const decisions = await database.db.select().from(approvals);
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0].decision, "REJECTED");
  assert.equal(decisions[0].rationale, "Resolution is too risky");
});

test("returns rejected and later approved records in chronological persisted history", async () => {
  const { service } = await createService();
  const setup = await awaitingApproval(service);
  const rejected = await service.reject(setup.created.id, {
    expectedVersion: setup.ready.version,
    investigationId: setup.investigation.id,
    rationale: "Needs a narrower action",
  });
  const revision = await service.startInvestigation(setup.created.id, { expectedVersion: rejected.incident.version });
  const ready = await service.recordInvestigationResult(setup.created.id, {
    expectedVersion: revision.incident.version,
    investigationId: revision.investigation.id,
    outcome: "READY_FOR_APPROVAL",
    findings: "A narrower recovery is available",
    proposedResolution: "Use the bounded recovery runbook",
    summary: "Use the bounded recovery runbook.",
  });
  await service.approve(setup.created.id, {
    expectedVersion: ready.version,
    investigationId: revision.investigation.id,
    action: { type: "MANUAL_REMEDIATION", summary: "Use the bounded recovery runbook", parameters: {} },
  });
  const history = await service.details(setup.created.id);
  assert.equal(history.investigations.length, 2);
  assert.equal(history.approvals.length, 2);
  assert.deepEqual(history.approvals.map(item => item.decision), ["REJECTED", "APPROVED"]);
  assert.equal(history.approvals[0]?.investigationId, setup.investigation.id);
  assert.equal(history.approvals[1]?.investigationId, revision.investigation.id);
});

test("supports investigation failure retry and no-action closure", async () => {
  const { service } = await createService();
  const created = await service.create({ title: "Alert noise", description: "Alert fired", severity: "LOW" });
  const first = await service.startInvestigation(created.id, { expectedVersion: created.version });
  const failed = await service.recordInvestigationResult(created.id, {
    expectedVersion: first.incident.version,
    investigationId: first.investigation.id,
    outcome: "FAILED",
    errorMessage: "Evidence unavailable",
  });
  const retry = await service.startInvestigation(created.id, { expectedVersion: failed.version });
  const noAction = await service.recordInvestigationResult(created.id, {
    expectedVersion: retry.incident.version,
    investigationId: retry.investigation.id,
    outcome: "NO_ACTION_REQUIRED",
    findings: "Alert was a false positive",
    summary: "The alert was a false positive.",
  });
  const closed = await service.close(created.id, {
    expectedVersion: noAction.version,
    resolutionSummary: "No remediation required",
  });
  assert.equal(closed.status, "CLOSED");
});

test("rolls back a transition when audit persistence fails", async () => {
  const { database, service } = await createService();
  const incident = await service.create({ title: "Cache miss", description: "Cache is cold", severity: "LOW" });
  await database.client.execute(`
    CREATE TRIGGER reject_audit BEFORE INSERT ON audit_events
    BEGIN
      SELECT RAISE(ABORT, 'audit unavailable');
    END
  `);

  await assert.rejects(service.startInvestigation(incident.id, { expectedVersion: incident.version }));
  const [unchanged] = await database.db.select().from(incidents).where(eq(incidents.id, incident.id));
  assert.equal(unchanged.status, "OPEN");
  assert.equal(unchanged.version, incident.version);
  assert.equal((await database.db.select().from(investigations)).length, 0);
  assert.equal((await database.db.select().from(auditEvents)).length, 1);
  assert.equal((await database.db.select().from(executions)).length, 0);
});

test("acknowledges and records validated manual notes with optimistic concurrency", async () => {
  const { database, service } = await createService();
  const created = await service.create({ title: "Cache pressure", description: "Workers are saturated", severity: "HIGH" });
  const acknowledged = await service.acknowledge(created.id, { expectedVersion: created.version });
  assert.equal(acknowledged.status, "OPEN");
  assert.equal(acknowledged.version, created.version + 1);
  const noted = await service.addManualNote(created.id, { expectedVersion: acknowledged.version, note: "On-call acknowledged the alert." });
  assert.equal(noted.version, acknowledged.version + 1);
  await assert.rejects(service.addManualNote(created.id, { expectedVersion: noted.version, note: " " }));
  await assert.rejects(service.addManualNote(created.id, { expectedVersion: acknowledged.version, note: "Stale note" }), StaleIncidentVersionError);
  const history = await database.db.select().from(auditEvents).where(eq(auditEvents.incidentId, created.id));
  assert.equal(history.at(-2)?.eventType, "INCIDENT_ACKNOWLEDGED");
  assert.equal(history.at(-1)?.eventType, "MANUAL_NOTE_ADDED");
  assert.match(history.at(-1)?.metadata ?? "", /On-call acknowledged/);
});

test("rolls back acknowledgement when its audit event cannot persist", async () => {
  const { database, service } = await createService();
  const created = await service.create({ title: "Auth errors", description: "Sign-ins fail", severity: "MEDIUM" });
  await database.client.execute(`
    CREATE TRIGGER reject_audit BEFORE INSERT ON audit_events
    BEGIN
      SELECT RAISE(ABORT, 'audit unavailable');
    END
  `);
  await assert.rejects(service.acknowledge(created.id, { expectedVersion: created.version }));
  const [unchanged] = await database.db.select().from(incidents).where(eq(incidents.id, created.id));
  assert.equal(unchanged.version, created.version);
});
