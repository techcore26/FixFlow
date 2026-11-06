import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import type { FixFlowDatabase } from "@/db/client";
import { auditEvents, type AuditEvent, type NewAuditEvent } from "@/db/schema";

type CreateAuditEventInput = Omit<NewAuditEvent, "id" | "createdAt"> & { id?: string };

export function createAuditEventRepository(db: FixFlowDatabase) {
  return {
    async create(input: CreateAuditEventInput): Promise<AuditEvent> {
      const [event] = await db
        .insert(auditEvents)
        .values({ ...input, id: input.id ?? randomUUID() })
        .returning();
      return event;
    },

    async listForIncident(incidentId: string): Promise<AuditEvent[]> {
      return db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.incidentId, incidentId))
        .orderBy(asc(auditEvents.createdAt));
    },
  };
}
