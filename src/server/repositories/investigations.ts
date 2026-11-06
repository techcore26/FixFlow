import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import type { FixFlowDatabase } from "@/db/client";
import { investigations, type Investigation, type NewInvestigation } from "@/db/schema";

type CreateInvestigationInput = Omit<NewInvestigation, "id" | "createdAt" | "updatedAt"> & { id?: string };

export function createInvestigationRepository(db: FixFlowDatabase) {
  return {
    async create(input: CreateInvestigationInput): Promise<Investigation> {
      const [investigation] = await db
        .insert(investigations)
        .values({ ...input, id: input.id ?? randomUUID() })
        .returning();
      return investigation;
    },

    async listForIncident(incidentId: string): Promise<Investigation[]> {
      return db
        .select()
        .from(investigations)
        .where(eq(investigations.incidentId, incidentId))
        .orderBy(asc(investigations.createdAt));
    },
  };
}
