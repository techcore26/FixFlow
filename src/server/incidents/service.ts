import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { LOCAL_OPERATOR } from "@/config/operator";
import type { FixFlowDatabase } from "@/db/client";
import {
  approvals,
  auditEvents,
  executionAttempts,
  executions,
  incidents,
  investigations,
  switchInvestigationJobs,
  type Incident,
} from "@/db/schema";
import type { IncidentStatus } from "@/db/types";
import {
  approvalSchema,
  acknowledgementSchema,
  closureSchema,
  createIncidentSchema,
  executionUpdateSchema,
  investigationResultSchema,
  noActionSchema,
  manualNoteSchema,
  rejectionSchema,
  versionedMutationSchema,
  type ApprovalInput,
  type AcknowledgementInput,
  type ClosureInput,
  type CreateIncidentInput,
  type ExecutionUpdateInput,
  type InvestigationResultInput,
  type NoActionInput,
  type ManualNoteInput,
  type RejectionInput,
  type VersionedMutationInput,
  type QueueSwitchInvestigationInput,
} from "@/validation/incidents";
import {
  ApprovalIntegrityError,
  IncidentNotFoundError,
  InvalidTransitionError,
  RelatedRecordNotFoundError,
  StaleIncidentVersionError,
} from "./errors";
import { assertTransition } from "./state-machine";

type Transaction = Parameters<Parameters<FixFlowDatabase["transaction"]>[0]>[0];

async function requireIncident(transaction: Transaction, id: string): Promise<Incident> {
  const [incident] = await transaction.select().from(incidents).where(eq(incidents.id, id)).limit(1);
  if (!incident) throw new IncidentNotFoundError(id);
  return incident;
}

async function transitionIncident(
  transaction: Transaction,
  incident: Incident,
  expectedVersion: number,
  nextStatus: IncidentStatus,
  eventType: string,
  metadata?: Record<string, unknown>,
): Promise<Incident> {
  if (incident.version !== expectedVersion) throw new StaleIncidentVersionError();
  assertTransition(incident.status, nextStatus);

  const [updated] = await transaction
    .update(incidents)
    .set({
      status: nextStatus,
      version: incident.version + 1,
      updatedAt: new Date(),
      closedAt: nextStatus === "CLOSED" ? new Date() : incident.closedAt,
    })
    .where(
      and(
        eq(incidents.id, incident.id),
        eq(incidents.version, expectedVersion),
        eq(incidents.status, incident.status),
      ),
    )
    .returning();

  if (!updated) throw new StaleIncidentVersionError();

  await transaction.insert(auditEvents).values({
    id: randomUUID(),
    incidentId: incident.id,
    actor: LOCAL_OPERATOR,
    eventType,
    previousStatus: incident.status,
    newStatus: nextStatus,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });

  return updated;
}

export class IncidentService {
  constructor(private readonly db: FixFlowDatabase) {}

  async create(input: CreateIncidentInput) {
    const parsed = createIncidentSchema.parse(input);
    return this.db.transaction(async (transaction) => {
      const [incident] = await transaction
        .insert(incidents)
        .values({ id: randomUUID(), ...parsed })
        .returning();
      await transaction.insert(auditEvents).values({
        id: randomUUID(),
        incidentId: incident.id,
        actor: LOCAL_OPERATOR,
        eventType: "INCIDENT_CREATED",
        newStatus: "OPEN",
        metadata: JSON.stringify({ severity: incident.severity }),
      });
      return incident;
    });
  }

  async list() {
    return this.db.select().from(incidents).orderBy(desc(incidents.createdAt));
  }

  async details(id: string) {
    const incident = await this.db.query.incidents.findFirst({ where: eq(incidents.id, id) });
    if (!incident) throw new IncidentNotFoundError(id);

    const [incidentInvestigations, incidentApprovals, incidentExecutions, history] = await Promise.all([
      this.db.select().from(investigations).where(eq(investigations.incidentId, id)).orderBy(asc(investigations.createdAt)),
      this.db.select().from(approvals).where(eq(approvals.incidentId, id)).orderBy(asc(approvals.createdAt)),
      this.db.select().from(executions).where(eq(executions.incidentId, id)).orderBy(asc(executions.createdAt)),
      this.db.select().from(auditEvents).where(eq(auditEvents.incidentId, id)).orderBy(asc(auditEvents.createdAt)),
    ]);
    const attempts = incidentExecutions.length
      ? await this.db.select().from(executionAttempts).where(inArray(executionAttempts.executionId, incidentExecutions.map(item => item.id))).orderBy(asc(executionAttempts.executionId), asc(executionAttempts.attemptNumber))
      : [];

    return {
      incident,
      investigations: incidentInvestigations,
      approvals: incidentApprovals,
      executions: incidentExecutions,
      executionAttempts: attempts,
      auditEvents: history,
    };
  }

  async startInvestigation(id: string, input: VersionedMutationInput) {
    const parsed = versionedMutationSchema.parse(input);
    return this.db.transaction(async (transaction) => {
      const incident = await requireIncident(transaction, id);

      if (incident.status === "FAILED") {
        const [existingExecution] = await transaction
          .select({ id: executions.id })
          .from(executions)
          .where(eq(executions.incidentId, id))
          .limit(1);
        if (existingExecution) throw new InvalidTransitionError("FAILED_EXECUTION", "INVESTIGATING");
      }

      const updated = await transitionIncident(
        transaction,
        incident,
        parsed.expectedVersion,
        "INVESTIGATING",
        incident.status === "REJECTED" ? "INVESTIGATION_REVISION_STARTED" : "INVESTIGATION_STARTED",
      );
      const [investigation] = await transaction
        .insert(investigations)
        .values({ id: randomUUID(), incidentId: id, status: "RUNNING" })
        .returning();
      return { incident: updated, investigation };
    });
  }

  async queueSwitchInvestigation(
    id: string,
    input: QueueSwitchInvestigationInput,
    bridge: { requestId: string; expectedRoomId: string; expectedSenderId: string; deadlineAt: Date },
  ) {
    const parsed = versionedMutationSchema.parse(input);
    return this.db.transaction(async (transaction) => {
      const incident = await requireIncident(transaction, id);
      if (incident.status === "FAILED") {
        const [existingExecution] = await transaction.select({ id: executions.id }).from(executions).where(eq(executions.incidentId, id)).limit(1);
        if (existingExecution) throw new InvalidTransitionError("FAILED_EXECUTION", "INVESTIGATING");
      }
      const updated = await transitionIncident(transaction, incident, parsed.expectedVersion, "INVESTIGATING", incident.status === "REJECTED" ? "INVESTIGATION_REVISION_STARTED" : "INVESTIGATION_STARTED", { source: "switch" });
      const [investigation] = await transaction.insert(investigations).values({ id: randomUUID(), incidentId: id, status: "RUNNING", externalReference: bridge.requestId }).returning();
      const [job] = await transaction.insert(switchInvestigationJobs).values({
        id: randomUUID(), requestId: bridge.requestId, incidentId: id, investigationId: investigation.id,
        expectedRoomId: bridge.expectedRoomId, expectedSenderId: bridge.expectedSenderId, deadlineAt: bridge.deadlineAt,
      }).returning();
      await transaction.insert(auditEvents).values({ id: randomUUID(), incidentId: id, actor: LOCAL_OPERATOR, eventType: "SWITCH_INVESTIGATION_QUEUED", previousStatus: updated.status, newStatus: updated.status, metadata: JSON.stringify({ requestId: bridge.requestId, investigationId: investigation.id }) });
      return { incident: updated, investigation, job };
    });
  }

  async acknowledge(id: string, input: AcknowledgementInput) {
    const parsed = acknowledgementSchema.parse(input);
    return this.recordAuditOnly(id, parsed.expectedVersion, "INCIDENT_ACKNOWLEDGED");
  }

  async addManualNote(id: string, input: ManualNoteInput) {
    const parsed = manualNoteSchema.parse(input);
    return this.recordAuditOnly(id, parsed.expectedVersion, "MANUAL_NOTE_ADDED", { note: parsed.note });
  }

  private async recordAuditOnly(id: string, expectedVersion: number, eventType: string, metadata?: Record<string, unknown>) {
    return this.db.transaction(async (transaction) => {
      const incident = await requireIncident(transaction, id);
      if (incident.status === "CLOSED") throw new InvalidTransitionError("CLOSED", eventType);
      if (incident.version !== expectedVersion) throw new StaleIncidentVersionError();
      const [updated] = await transaction.update(incidents).set({ version: incident.version + 1, updatedAt: new Date() }).where(and(eq(incidents.id, id), eq(incidents.version, expectedVersion), eq(incidents.status, incident.status))).returning();
      if (!updated) throw new StaleIncidentVersionError();
      await transaction.insert(auditEvents).values({ id: randomUUID(), incidentId: id, actor: LOCAL_OPERATOR, eventType, previousStatus: incident.status, newStatus: incident.status, metadata: metadata ? JSON.stringify(metadata) : null });
      return updated;
    });
  }

  async recordInvestigationResult(id: string, input: InvestigationResultInput) {
    const parsed = investigationResultSchema.parse(input);
    return this.db.transaction(async (transaction) => {
      const incident = await requireIncident(transaction, id);
      const [investigation] = await transaction
        .select()
        .from(investigations)
        .where(
          and(
            eq(investigations.id, parsed.investigationId),
            eq(investigations.incidentId, id),
            inArray(investigations.status, ["PENDING", "RUNNING"]),
          ),
        )
        .limit(1);
      if (!investigation) throw new RelatedRecordNotFoundError("Active investigation");

      if (parsed.outcome === "READY_FOR_APPROVAL") {
        const updated = await transitionIncident(
          transaction,
          incident,
          parsed.expectedVersion,
          "AWAITING_APPROVAL",
          "INVESTIGATION_COMPLETED",
          { investigationId: investigation.id },
        );
        await transaction
          .update(investigations)
          .set({
            status: "COMPLETED",
            findings: parsed.findings,
            proposedResolution: parsed.proposedResolution,
            summary: parsed.summary,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(investigations.id, investigation.id));
        return updated;
      }

      if (parsed.outcome === "NO_ACTION_REQUIRED") {
        const updated = await transitionIncident(
          transaction,
          incident,
          parsed.expectedVersion,
          "NO_ACTION_REQUIRED",
          "INVESTIGATION_NO_ACTION_REQUIRED",
          { investigationId: investigation.id },
        );
        await transaction
          .update(investigations)
          .set({ status: "COMPLETED", findings: parsed.findings, summary: parsed.summary, completedAt: new Date(), updatedAt: new Date() })
          .where(eq(investigations.id, investigation.id));
        return updated;
      }

      const updated = await transitionIncident(
        transaction,
        incident,
        parsed.expectedVersion,
        "FAILED",
        "INVESTIGATION_FAILED",
        { investigationId: investigation.id },
      );
      await transaction
        .update(investigations)
        .set({
          status: "FAILED",
          findings: parsed.findings,
          summary: parsed.summary,
          errorMessage: parsed.errorMessage,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(investigations.id, investigation.id));
      return updated;
    });
  }

  async approve(id: string, input: ApprovalInput) {
    const parsed = approvalSchema.parse(input);
    return this.decide(id, parsed, "APPROVED");
  }

  async reject(id: string, input: RejectionInput) {
    const parsed = rejectionSchema.parse(input);
    return this.decide(id, parsed, "REJECTED");
  }

  async markNoAction(id: string, input: NoActionInput) {
    const parsed = noActionSchema.parse(input);
    return this.decide(id, parsed, "NO_ACTION_REQUIRED");
  }

  private async decide(
    id: string,
    input: ApprovalInput | RejectionInput | NoActionInput,
    decision: "APPROVED" | "REJECTED" | "NO_ACTION_REQUIRED",
  ) {
    return this.db.transaction(async (transaction) => {
      const incident = await requireIncident(transaction, id);
      const [investigation] = await transaction
        .select()
        .from(investigations)
        .where(
          and(
            eq(investigations.id, input.investigationId),
            eq(investigations.incidentId, id),
            eq(investigations.status, "COMPLETED"),
          ),
        )
        .limit(1);
      if (!investigation) throw new RelatedRecordNotFoundError("Completed investigation");
      if (!investigation.proposedResolution) {
        throw new ApprovalIntegrityError("The investigation has no proposed resolution to decide.");
      }

      const proposedActionSnapshot =
        decision === "APPROVED"
          ? JSON.stringify((input as ApprovalInput).action)
          : JSON.stringify({ proposedResolution: investigation.proposedResolution });
      const updated = await transitionIncident(
        transaction,
        incident,
        input.expectedVersion,
        decision,
        `RESOLUTION_${decision}`,
        { investigationId: investigation.id },
      );
      const [approval] = await transaction
        .insert(approvals)
        .values({
          id: randomUUID(),
          incidentId: id,
          investigationId: investigation.id,
          decision,
          actor: LOCAL_OPERATOR,
          rationale: input.rationale,
          proposedActionSnapshot,
        })
        .returning();
      return { incident: updated, approval };
    });
  }

  async trackExecution(id: string, input: ExecutionUpdateInput) {
    const parsed = executionUpdateSchema.parse(input);
    return this.db.transaction(async (transaction) => {
      const incident = await requireIncident(transaction, id);

      if (parsed.operation === "START") {
        const [approval] = await transaction
          .select()
          .from(approvals)
          .where(and(eq(approvals.id, parsed.approvalId), eq(approvals.incidentId, id)))
          .limit(1);
        if (!approval || approval.decision !== "APPROVED") {
          throw new ApprovalIntegrityError("Execution requires an approval for this incident.");
        }
        const executionId = randomUUID();
        const attemptId = randomUUID();
        const startedAt = new Date();
        const updated = await transitionIncident(
          transaction,
          incident,
          parsed.expectedVersion,
          "EXECUTING",
          "EXECUTION_STARTED",
          { approvalId: approval.id, executionId, attemptId, attemptNumber: 1, idempotencyKey: parsed.idempotencyKey },
        );
        const [execution] = await transaction
          .insert(executions)
          .values({
            id: executionId,
            incidentId: id,
            approvalId: approval.id,
            status: "RUNNING",
            idempotencyKey: parsed.idempotencyKey,
            requestSummary: parsed.requestSummary,
            startedAt,
          })
          .returning();
        const [attempt] = await transaction.insert(executionAttempts).values({
          id: attemptId,
          executionId: execution.id,
          attemptNumber: 1,
          source: "LIVE",
          status: "RUNNING",
          requestSummary: parsed.requestSummary,
          startedAt,
        }).returning();
        return { incident: updated, execution, attempt, approvedActionSnapshot: approval.proposedActionSnapshot };
      }

      const [execution] = await transaction
        .select()
        .from(executions)
        .where(and(eq(executions.id, parsed.executionId), eq(executions.incidentId, id)))
        .limit(1);
      if (!execution) throw new RelatedRecordNotFoundError("Execution");
      const [approval] = await transaction
        .select()
        .from(approvals)
        .where(eq(approvals.id, execution.approvalId))
        .limit(1);
      if (!approval || approval.decision !== "APPROVED") {
        throw new ApprovalIntegrityError("The execution is not backed by an approved snapshot.");
      }

      if (parsed.operation === "RETRY") {
        if (execution.status !== "FAILED") throw new InvalidTransitionError(execution.status, "RUNNING");
        const [previousAttempt] = await transaction.select().from(executionAttempts).where(eq(executionAttempts.executionId, execution.id)).orderBy(desc(executionAttempts.attemptNumber)).limit(1);
        const attemptNumber = (previousAttempt?.attemptNumber ?? 0) + 1;
        const attemptId = randomUUID();
        const startedAt = new Date();
        const updated = await transitionIncident(
          transaction,
          incident,
          parsed.expectedVersion,
          "EXECUTING",
          "EXECUTION_RETRIED",
          { executionId: execution.id, approvalId: approval.id, attemptId, attemptNumber, idempotencyKey: execution.idempotencyKey },
        );
        const [retried] = await transaction
          .update(executions)
          .set({
            status: "RUNNING",
            requestSummary: parsed.requestSummary ?? execution.requestSummary,
            errorMessage: null,
            startedAt,
            finishedAt: null,
          })
          .where(and(eq(executions.id, execution.id), eq(executions.status, "FAILED")))
          .returning();
        if (!retried) throw new StaleIncidentVersionError();
        const [attempt] = await transaction.insert(executionAttempts).values({
          id: attemptId,
          executionId: execution.id,
          attemptNumber,
          source: "LIVE",
          status: "RUNNING",
          requestSummary: parsed.requestSummary ?? execution.requestSummary,
          startedAt,
        }).returning();
        return { incident: updated, execution: retried, attempt, approvedActionSnapshot: approval.proposedActionSnapshot };
      }

      if (execution.status !== "RUNNING") throw new InvalidTransitionError(execution.status, parsed.operation);
      const succeeded = parsed.operation === "SUCCEED";
      const [attempt] = await transaction.select().from(executionAttempts).where(and(eq(executionAttempts.executionId, execution.id), eq(executionAttempts.status, "RUNNING"))).limit(1);
      if (!attempt) throw new RelatedRecordNotFoundError("Running execution attempt");
      const finishedAt = new Date();
      const updated = await transitionIncident(
        transaction,
        incident,
        parsed.expectedVersion,
        succeeded ? "RESOLVED" : "FAILED",
        succeeded ? "EXECUTION_SUCCEEDED" : "EXECUTION_FAILED",
        { executionId: execution.id, approvalId: approval.id, attemptId: attempt.id, attemptNumber: attempt.attemptNumber, idempotencyKey: execution.idempotencyKey },
      );
      const [completedAttempt] = await transaction.update(executionAttempts).set({
        status: succeeded ? "SUCCEEDED" : "FAILED",
        resultSummary: succeeded ? parsed.resultSummary : attempt.resultSummary,
        errorMessage: succeeded ? null : parsed.errorMessage,
        finishedAt,
      }).where(and(eq(executionAttempts.id, attempt.id), eq(executionAttempts.status, "RUNNING"))).returning();
      if (!completedAttempt) throw new StaleIncidentVersionError();
      const [completed] = await transaction
        .update(executions)
        .set({
          status: succeeded ? "SUCCEEDED" : "FAILED",
          resultSummary: succeeded ? parsed.resultSummary : execution.resultSummary,
          errorMessage: succeeded ? null : parsed.errorMessage,
          finishedAt,
        })
        .where(and(eq(executions.id, execution.id), eq(executions.status, "RUNNING")))
        .returning();
      if (!completed) throw new StaleIncidentVersionError();
      return { incident: updated, execution: completed, attempt: completedAttempt, approvedActionSnapshot: approval.proposedActionSnapshot };
    });
  }

  async close(id: string, input: ClosureInput) {
    const parsed = closureSchema.parse(input);
    return this.db.transaction(async (transaction) => {
      const incident = await requireIncident(transaction, id);
      return transitionIncident(
        transaction,
        incident,
        parsed.expectedVersion,
        "CLOSED",
        "INCIDENT_CLOSED",
        { resolutionSummary: parsed.resolutionSummary },
      );
    });
  }
}
