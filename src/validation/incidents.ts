import { z } from "zod";
import { severities } from "@/db/types";

const expectedVersion = z.number().int().positive();
const identifier = z.string().trim().min(1).max(128);
const summary = z.string().trim().min(1).max(2_000);

export const createIncidentSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(10_000),
  severity: z.enum(severities),
});

export const versionedMutationSchema = z.object({ expectedVersion });
export const queueSwitchInvestigationSchema = z.object({ expectedVersion });
export const acknowledgementSchema = z.object({ expectedVersion });
export const manualNoteSchema = z.object({ expectedVersion, note: summary });

export const investigationResultSchema = z.discriminatedUnion("outcome", [
  z.object({
    expectedVersion,
    investigationId: identifier,
    outcome: z.literal("READY_FOR_APPROVAL"),
    findings: summary,
    proposedResolution: summary,
    summary,
  }),
  z.object({
    expectedVersion,
    investigationId: identifier,
    outcome: z.literal("FAILED"),
    findings: summary.optional(),
    errorMessage: summary,
    summary: summary.optional(),
  }),
  z.object({
    expectedVersion,
    investigationId: identifier,
    outcome: z.literal("NO_ACTION_REQUIRED"),
    findings: summary,
    summary,
  }),
]);

const actionParameters = z.record(z.string(), z.string().max(2_000)).superRefine((parameters, context) => {
  for (const key of Object.keys(parameters)) {
    if (/command|patch|script|cookie|secret|credential/i.test(key)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `Unsafe action parameter key: ${key}` });
    }
  }
});

export const approvedActionSchema = z.object({
  type: z.enum(["CONFIG_CHANGE", "DEPLOYMENT", "ROLLBACK", "RESTART_SERVICE", "MANUAL_REMEDIATION", "OTHER"]),
  summary,
  parameters: actionParameters.default({}),
});

export const approvalSchema = z.object({
  expectedVersion,
  investigationId: identifier,
  rationale: z.string().trim().max(2_000).optional(),
  action: approvedActionSchema,
});

export const rejectionSchema = z.object({
  expectedVersion,
  investigationId: identifier,
  rationale: summary,
});

export const noActionSchema = z.object({
  expectedVersion,
  investigationId: identifier,
  rationale: summary,
});

export const executionUpdateSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("START"),
    expectedVersion,
    approvalId: identifier,
    idempotencyKey: z.string().trim().min(8).max(200),
    requestSummary: summary.optional(),
  }),
  z.object({
    operation: z.literal("SUCCEED"),
    expectedVersion,
    executionId: identifier,
    resultSummary: summary,
  }),
  z.object({
    operation: z.literal("FAIL"),
    expectedVersion,
    executionId: identifier,
    errorMessage: summary,
  }),
  z.object({
    operation: z.literal("RETRY"),
    expectedVersion,
    executionId: identifier,
    requestSummary: summary.optional(),
  }),
]);

export const closureSchema = z.object({
  expectedVersion,
  resolutionSummary: summary,
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type VersionedMutationInput = z.infer<typeof versionedMutationSchema>;
export type QueueSwitchInvestigationInput = z.infer<typeof queueSwitchInvestigationSchema>;
export type AcknowledgementInput = z.infer<typeof acknowledgementSchema>;
export type ManualNoteInput = z.infer<typeof manualNoteSchema>;
export type InvestigationResultInput = z.infer<typeof investigationResultSchema>;
export type ApprovalInput = z.infer<typeof approvalSchema>;
export type RejectionInput = z.infer<typeof rejectionSchema>;
export type NoActionInput = z.infer<typeof noActionSchema>;
export type ExecutionUpdateInput = z.infer<typeof executionUpdateSchema>;
export type ClosureInput = z.infer<typeof closureSchema>;
