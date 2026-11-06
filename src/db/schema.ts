import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type {
  ApprovalDecision,
  ExecutionStatus,
  ExecutionAttemptSource,
  ExecutionAttemptStatus,
  IncidentStatus,
  InvestigationStatus,
  Severity,
  SwitchInvestigationJobStatus,
} from "./types";

const timestamp = (name: string) =>
  integer(name, { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`);

export const incidents = sqliteTable(
  "incidents",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    severity: text("severity").$type<Severity>().notNull(),
    status: text("status").$type<IncidentStatus>().notNull().default("OPEN"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
    closedAt: integer("closed_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("incidents_status_idx").on(table.status),
    index("incidents_created_at_idx").on(table.createdAt),
    check("incidents_version_positive", sql`${table.version} >= 1`),
    check(
      "incidents_status_check",
      sql`${table.status} in ('OPEN', 'INVESTIGATING', 'AWAITING_APPROVAL', 'APPROVED', 'EXECUTING', 'RESOLVED', 'CLOSED', 'REJECTED', 'FAILED', 'NO_ACTION_REQUIRED')`,
    ),
    check("incidents_severity_check", sql`${table.severity} in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')`),
  ],
);

export const investigations = sqliteTable(
  "investigations",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade", onUpdate: "cascade" }),
    status: text("status").$type<InvestigationStatus>().notNull().default("PENDING"),
    externalReference: text("external_reference"),
    findings: text("findings"),
    proposedResolution: text("proposed_resolution"),
    summary: text("summary"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("investigations_incident_idx").on(table.incidentId),
    index("investigations_status_idx").on(table.status),
    uniqueIndex("investigations_external_reference_unique").on(table.externalReference),
    check(
      "investigations_status_check",
      sql`${table.status} in ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')`,
    ),
  ],
);

export const approvals = sqliteTable(
  "approvals",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade", onUpdate: "cascade" }),
    investigationId: text("investigation_id")
      .notNull()
      .references(() => investigations.id, { onDelete: "cascade", onUpdate: "cascade" }),
    decision: text("decision").$type<ApprovalDecision>().notNull(),
    actor: text("actor").notNull(),
    rationale: text("rationale"),
    proposedActionSnapshot: text("proposed_action_snapshot").notNull(),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    index("approvals_incident_idx").on(table.incidentId),
    uniqueIndex("approvals_investigation_unique").on(table.investigationId),
    check(
      "approvals_decision_check",
      sql`${table.decision} in ('APPROVED', 'REJECTED', 'NO_ACTION_REQUIRED')`,
    ),
  ],
);

export const executions = sqliteTable(
  "executions",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade", onUpdate: "cascade" }),
    approvalId: text("approval_id")
      .notNull()
      .references(() => approvals.id, { onDelete: "restrict", onUpdate: "cascade" }),
    status: text("status").$type<ExecutionStatus>().notNull().default("PENDING"),
    idempotencyKey: text("idempotency_key").notNull(),
    requestSummary: text("request_summary"),
    resultSummary: text("result_summary"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at"),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("executions_incident_idx").on(table.incidentId),
    uniqueIndex("executions_approval_unique").on(table.approvalId),
    uniqueIndex("executions_idempotency_key_unique").on(table.idempotencyKey),
    check("executions_status_check", sql`${table.status} in ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED')`),
  ],
);

export const executionAttempts = sqliteTable(
  "execution_attempts",
  {
    id: text("id").primaryKey(),
    executionId: text("execution_id").notNull().references(() => executions.id, { onDelete: "cascade", onUpdate: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    source: text("source").$type<ExecutionAttemptSource>().notNull().default("LIVE"),
    status: text("status").$type<ExecutionAttemptStatus>().notNull().default("RUNNING"),
    requestSummary: text("request_summary"),
    resultSummary: text("result_summary"),
    errorMessage: text("error_message"),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    uniqueIndex("execution_attempts_execution_number_unique").on(table.executionId, table.attemptNumber),
    uniqueIndex("execution_attempts_one_running_unique").on(table.executionId).where(sql`${table.status} = 'RUNNING'`),
    index("execution_attempts_execution_number_idx").on(table.executionId, table.attemptNumber),
    check("execution_attempts_number_nonnegative", sql`${table.attemptNumber} >= 0`),
    check("execution_attempts_status_check", sql`${table.status} in ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED')`),
    check("execution_attempts_source_check", sql`${table.source} in ('LIVE', 'LEGACY_AGGREGATE')`),
  ],
);

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade", onUpdate: "cascade" }),
    actor: text("actor").notNull(),
    eventType: text("event_type").notNull(),
    previousStatus: text("previous_status").$type<IncidentStatus>(),
    newStatus: text("new_status").$type<IncidentStatus>(),
    metadata: text("metadata"),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    index("audit_events_incident_created_idx").on(table.incidentId, table.createdAt),
    index("audit_events_type_idx").on(table.eventType),
  ],
);

export const switchInvestigationJobs = sqliteTable(
  "switch_investigation_jobs",
  {
    id: text("id").primaryKey(), requestId: text("request_id").notNull(),
    incidentId: text("incident_id").notNull().references(() => incidents.id, { onDelete: "cascade", onUpdate: "cascade" }),
    investigationId: text("investigation_id").notNull().references(() => investigations.id, { onDelete: "cascade", onUpdate: "cascade" }),
    status: text("status").$type<SwitchInvestigationJobStatus>().notNull().default("PENDING"),
    expectedRoomId: text("expected_room_id").notNull(), expectedSenderId: text("expected_sender_id").notNull(),
    outboundEventId: text("outbound_event_id"), replyMessageId: text("reply_message_id"), candidateJson: text("candidate_json"), responseEvidence: text("response_evidence"), errorCode: text("error_code"), errorMessage: text("error_message"),
    attempts: integer("attempts").notNull().default(0), leaseOwner: text("lease_owner"), leaseExpiresAt: integer("lease_expires_at", { mode: "timestamp_ms" }), deadlineAt: integer("deadline_at", { mode: "timestamp_ms" }).notNull(), sentAt: integer("sent_at", { mode: "timestamp_ms" }), receivedAt: integer("received_at", { mode: "timestamp_ms" }), createdAt: timestamp("created_at"), updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("switch_jobs_request_unique").on(table.requestId), uniqueIndex("switch_jobs_investigation_unique").on(table.investigationId), uniqueIndex("switch_jobs_reply_message_unique").on(table.replyMessageId), index("switch_jobs_status_deadline_idx").on(table.status, table.deadlineAt), index("switch_jobs_incident_idx").on(table.incidentId), check("switch_jobs_attempts_nonnegative", sql`${table.attempts} >= 0`), check("switch_jobs_status_check", sql`${table.status} in ('PENDING', 'DISPATCHING', 'SENT', 'DELIVERY_UNKNOWN', 'RESPONSE_RECEIVED', 'RESPONSE_REJECTED', 'TIMED_OUT', 'FAILED')`),
  ],
);

export type Incident = typeof incidents.$inferSelect;
export type NewIncident = typeof incidents.$inferInsert;
export type Investigation = typeof investigations.$inferSelect;
export type NewInvestigation = typeof investigations.$inferInsert;
export type Approval = typeof approvals.$inferSelect;
export type NewApproval = typeof approvals.$inferInsert;
export type Execution = typeof executions.$inferSelect;
export type NewExecution = typeof executions.$inferInsert;
export type ExecutionAttempt = typeof executionAttempts.$inferSelect;
export type NewExecutionAttempt = typeof executionAttempts.$inferInsert;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;
export type SwitchInvestigationJob = typeof switchInvestigationJobs.$inferSelect;
