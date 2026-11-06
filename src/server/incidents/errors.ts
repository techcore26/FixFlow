export class IncidentError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class IncidentNotFoundError extends IncidentError {
  constructor(id: string) {
    super(`Incident ${id} was not found.`, "INCIDENT_NOT_FOUND", 404);
  }
}

export class RelatedRecordNotFoundError extends IncidentError {
  constructor(record: string) {
    super(`${record} was not found for this incident.`, "RELATED_RECORD_NOT_FOUND", 404);
  }
}

export class InvalidTransitionError extends IncidentError {
  constructor(from: string, to: string) {
    super(`Transition from ${from} to ${to} is not allowed.`, "INVALID_TRANSITION", 409);
  }
}

export class StaleIncidentVersionError extends IncidentError {
  constructor() {
    super("The incident changed since it was read. Refresh and retry.", "STALE_INCIDENT_VERSION", 409);
  }
}

export class ApprovalIntegrityError extends IncidentError {
  constructor(message: string) {
    super(message, "APPROVAL_INTEGRITY_ERROR", 409);
  }
}

export class ForbiddenMutationError extends IncidentError {
  constructor(message: string) {
    super(message, "FORBIDDEN_MUTATION", 403);
  }
}

export class SwitchIntegrationUnavailableError extends IncidentError {
  constructor(message = "Switch investigation is not configured on this local server.") { super(message, "SWITCH_INTEGRATION_UNAVAILABLE", 503); }
}
