import { randomUUID } from "node:crypto";
import type { FixFlowDatabase } from "@/db/client";
import { auditEvents, incidents, type AuditEvent, type Incident, type NewAuditEvent, type NewIncident } from "@/db/schema";

type IncidentInput = Omit<NewIncident, "id" | "createdAt" | "updatedAt" | "version"> & { id?: string };
type AuditInput = Omit<NewAuditEvent, "id" | "incidentId" | "createdAt"> & { id?: string };

export async function createIncidentWithAudit(
  db: FixFlowDatabase,
  incidentInput: IncidentInput,
  auditInput: AuditInput,
): Promise<{ incident: Incident; auditEvent: AuditEvent }> {
  return db.transaction(async (transaction) => {
    const incidentId = incidentInput.id ?? randomUUID();
    const [incident] = await transaction
      .insert(incidents)
      .values({ ...incidentInput, id: incidentId })
      .returning();
    const [auditEvent] = await transaction
      .insert(auditEvents)
      .values({ ...auditInput, id: auditInput.id ?? randomUUID(), incidentId })
      .returning();

    return { incident, auditEvent };
  });
}
