export type Severity="LOW"|"MEDIUM"|"HIGH"|"CRITICAL";
export type IncidentStatus="OPEN"|"INVESTIGATING"|"AWAITING_APPROVAL"|"APPROVED"|"EXECUTING"|"RESOLVED"|"CLOSED"|"REJECTED"|"FAILED"|"NO_ACTION_REQUIRED";
export interface Incident { id:string; title:string; description:string; severity:Severity; status:IncidentStatus; version:number; createdAt:string; updatedAt:string; closedAt:string|null; }
export interface Investigation { id:string; incidentId:string; status:string; externalReference:string|null; findings:string|null; proposedResolution:string|null; summary:string|null; errorMessage:string|null; createdAt:string; updatedAt:string; completedAt:string|null; }
export interface Approval { id:string; incidentId:string; investigationId:string; decision:string; actor:string; rationale:string|null; proposedActionSnapshot:string; createdAt:string; }
export interface Execution { id:string; incidentId:string; approvalId:string; status:string; idempotencyKey:string; requestSummary:string|null; resultSummary:string|null; errorMessage:string|null; createdAt:string; startedAt:string|null; finishedAt:string|null; }
export interface ExecutionAttempt { id:string; executionId:string; attemptNumber:number; source:"LIVE"|"LEGACY_AGGREGATE"; status:"PENDING"|"RUNNING"|"SUCCEEDED"|"FAILED"; requestSummary:string|null; resultSummary:string|null; errorMessage:string|null; startedAt:string|null; finishedAt:string|null; createdAt:string; }
export interface AuditEvent { id:string; incidentId:string; actor:string; eventType:string; previousStatus:IncidentStatus|null; newStatus:IncidentStatus|null; metadata:string|null; createdAt:string; }
export interface IncidentDetails { incident:Incident; investigations:Investigation[]; approvals:Approval[]; executions:Execution[]; executionAttempts:ExecutionAttempt[]; auditEvents:AuditEvent[]; }
export interface ApiEnvelope<T> { data:T; operatorMode?:string; warning?:string; }
