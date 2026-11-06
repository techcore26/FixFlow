import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import type { FixFlowDatabase } from "@/db/client";
import { incidents, type Incident, type NewIncident } from "@/db/schema";

export type CreateIncidentInput = Omit<NewIncident, "id" | "createdAt" | "updatedAt" | "version"> & {
  id?: string;
};

export function createIncidentRepository(db: FixFlowDatabase) {
  return {
    async create(input: CreateIncidentInput): Promise<Incident> {
      const [incident] = await db
        .insert(incidents)
        .values({ ...input, id: input.id ?? randomUUID() })
        .returning();
      return incident;
    },

    async findById(id: string): Promise<Incident | undefined> {
      return db.query.incidents.findFirst({ where: eq(incidents.id, id) });
    },

    async list(): Promise<Incident[]> {
      return db.select().from(incidents).orderBy(desc(incidents.createdAt));
    },
  };
}
