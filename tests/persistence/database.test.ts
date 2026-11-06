import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { eq } from "drizzle-orm";
import { createDatabase } from "../../src/db/client";
import { migrateDatabase } from "../../src/db/migrate";
import { approvals, auditEvents, executionAttempts, executions, incidents, investigations } from "../../src/db/schema";
import { createIncidentWithAudit } from "../../src/server/persistence/incident-write";
import { createApprovalRepository } from "../../src/server/repositories/approvals";
import { createExecutionRepository } from "../../src/server/repositories/executions";
import { createIncidentRepository } from "../../src/server/repositories/incidents";
import { createInvestigationRepository } from "../../src/server/repositories/investigations";

const temporaryDirectories: string[] = [];

async function createTestDatabase() {
  const directory = await mkdtemp(path.join(tmpdir(), "fixflow-db-"));
  temporaryDirectories.push(directory);
  const url = `file:${path.join(directory, "test.db")}`;
  await migrateDatabase(url);
  const database = createDatabase(url);
  await database.client.execute("PRAGMA foreign_keys = ON");
  return { ...database, url };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

test("persists all five entities and reopens the database", async () => {
  const database = await createTestDatabase();
  const incidentRepository = createIncidentRepository(database.db);
  const investigationRepository = createInvestigationRepository(database.db);
  const approvalRepository = createApprovalRepository(database.db);
  const executionRepository = createExecutionRepository(database.db);

  const incident = await incidentRepository.create({
    id: "incident-1",
    title: "API outage",
    description: "Requests are failing",
    severity: "HIGH",
  });
  assert.equal(incident.version, 1);

  const investigation = await investigationRepository.create({
    id: "investigation-1",
    incidentId: incident.id,
    status: "COMPLETED",
    findings: "A dependency is unavailable",
    proposedResolution: "Fail over to the standby",
  });
  const approval = await approvalRepository.create({
    id: "approval-1",
    incidentId: incident.id,
    investigationId: investigation.id,
    decision: "APPROVED",
    actor: "operator@example.test",
    proposedActionSnapshot: JSON.stringify({ action: "fail-over", target: "standby" }),
  });
  await executionRepository.create({
    id: "execution-1",
    incidentId: incident.id,
    approvalId: approval.id,
    idempotencyKey: "execution-key-1",
    status: "SUCCEEDED",
    resultSummary: "Standby promoted",
  });
  await database.db.insert(auditEvents).values({
    id: "audit-1",
    incidentId: incident.id,
    actor: "operator@example.test",
    eventType: "INCIDENT_CREATED",
    newStatus: "OPEN",
  });
  database.client.close();

  const reopened = createDatabase(database.url);
  await reopened.client.execute("PRAGMA foreign_keys = ON");
  assert.equal((await reopened.db.select().from(incidents)).length, 1);
  assert.equal((await reopened.db.select().from(investigations)).length, 1);
  assert.equal((await reopened.db.select().from(approvals)).length, 1);
  assert.equal((await reopened.db.select().from(executions)).length, 1);
  assert.equal((await reopened.db.select().from(auditEvents)).length, 1);
  reopened.client.close();
});

test("enforces foreign keys", async () => {
  const database = await createTestDatabase();
  await assert.rejects(
    database.db.insert(investigations).values({ id: "orphan", incidentId: "missing" }),
  );
  database.client.close();
});

test("backfills an existing execution as a clearly labelled legacy aggregate snapshot", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "fixflow-legacy-attempt-"));
  temporaryDirectories.push(directory);
  const database = createDatabase(`file:${path.join(directory, "legacy.db")}`);
  await database.client.execute("PRAGMA foreign_keys = ON");
  for (const migration of ["0000_fixflow_initial.sql", "0001_switch_investigation_jobs.sql", "0002_investigation_summary.sql"]) {
    await database.client.executeMultiple(readFileSync(new URL(`../../drizzle/${migration}`, import.meta.url), "utf8"));
  }
  await database.client.executeMultiple(`
    INSERT INTO incidents (id,title,description,severity,status,version) VALUES ('legacy-incident','Legacy','Existing record','HIGH','FAILED',3);
    INSERT INTO investigations (id,incident_id,status,findings,proposed_resolution) VALUES ('legacy-investigation','legacy-incident','COMPLETED','Found issue','Bounded action');
    INSERT INTO approvals (id,incident_id,investigation_id,decision,actor,proposed_action_snapshot) VALUES ('legacy-approval','legacy-incident','legacy-investigation','APPROVED','operator','{"summary":"Bounded action"}');
    INSERT INTO executions (id,incident_id,approval_id,status,idempotency_key,request_summary,error_message,started_at,finished_at) VALUES ('legacy-execution','legacy-incident','legacy-approval','FAILED','legacy-idempotency','Original tracking note','Original failure',1000,2000);
  `);
  await database.client.executeMultiple(readFileSync(new URL("../../drizzle/0003_execution_attempts.sql", import.meta.url), "utf8"));
  const [attempt] = await database.db.select().from(executionAttempts);
  assert.deepEqual({ executionId: attempt?.executionId, attemptNumber: attempt?.attemptNumber, source: attempt?.source, status: attempt?.status, requestSummary: attempt?.requestSummary, errorMessage: attempt?.errorMessage }, { executionId: "legacy-execution", attemptNumber: 0, source: "LEGACY_AGGREGATE", status: "FAILED", requestSummary: "Original tracking note", errorMessage: "Original failure" });
  database.client.close();
});

test("rolls back the incident when its audit insert fails", async () => {
  const database = await createTestDatabase();
  await database.db.insert(incidents).values({
    id: "existing-incident",
    title: "Existing",
    description: "Existing incident",
    severity: "LOW",
  });
  await database.db.insert(auditEvents).values({
    id: "duplicate-audit",
    incidentId: "existing-incident",
    actor: "system",
    eventType: "EXISTING",
  });

  await assert.rejects(
    createIncidentWithAudit(
      database.db,
      {
        id: "rolled-back-incident",
        title: "Must roll back",
        description: "Audit will fail",
        severity: "MEDIUM",
      },
      { id: "duplicate-audit", actor: "system", eventType: "INCIDENT_CREATED", newStatus: "OPEN" },
    ),
  );

  const rolledBack = await database.db.query.incidents.findFirst({
    where: eq(incidents.id, "rolled-back-incident"),
  });
  assert.equal(rolledBack, undefined);
  database.client.close();
});
