export const incidentStatuses = [
  "OPEN",
  "INVESTIGATING",
  "AWAITING_APPROVAL",
  "APPROVED",
  "EXECUTING",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
  "FAILED",
  "NO_ACTION_REQUIRED",
] as const;

export type IncidentStatus = (typeof incidentStatuses)[number];

export const severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type Severity = (typeof severities)[number];

export const investigationStatuses = ["PENDING", "RUNNING", "COMPLETED", "FAILED"] as const;
export type InvestigationStatus = (typeof investigationStatuses)[number];

export const approvalDecisions = ["APPROVED", "REJECTED", "NO_ACTION_REQUIRED"] as const;
export type ApprovalDecision = (typeof approvalDecisions)[number];

export const executionStatuses = ["PENDING", "RUNNING", "SUCCEEDED", "FAILED"] as const;
export type ExecutionStatus = (typeof executionStatuses)[number];

export const executionAttemptStatuses = ["PENDING", "RUNNING", "SUCCEEDED", "FAILED"] as const;
export type ExecutionAttemptStatus = (typeof executionAttemptStatuses)[number];

export const executionAttemptSources = ["LIVE", "LEGACY_AGGREGATE"] as const;
export type ExecutionAttemptSource = (typeof executionAttemptSources)[number];

export const switchInvestigationJobStatuses = ["PENDING", "DISPATCHING", "SENT", "DELIVERY_UNKNOWN", "RESPONSE_RECEIVED", "RESPONSE_REJECTED", "TIMED_OUT", "FAILED"] as const;
export type SwitchInvestigationJobStatus = (typeof switchInvestigationJobStatuses)[number];
