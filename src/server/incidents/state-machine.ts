import type { IncidentStatus } from "@/db/types";
import { InvalidTransitionError } from "./errors";

export const incidentTransitions = {
  OPEN: ["INVESTIGATING"],
  INVESTIGATING: ["AWAITING_APPROVAL", "FAILED", "NO_ACTION_REQUIRED"],
  AWAITING_APPROVAL: ["APPROVED", "REJECTED", "NO_ACTION_REQUIRED"],
  APPROVED: ["EXECUTING"],
  EXECUTING: ["RESOLVED", "FAILED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
  REJECTED: ["INVESTIGATING", "CLOSED"],
  FAILED: ["INVESTIGATING", "EXECUTING"],
  NO_ACTION_REQUIRED: ["CLOSED"],
} as const satisfies Record<IncidentStatus, readonly IncidentStatus[]>;

export function canTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return (incidentTransitions[from] as readonly IncidentStatus[]).includes(to);
}

export function assertTransition(from: IncidentStatus, to: IncidentStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}
