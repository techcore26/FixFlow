import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { FixFlowDatabase } from "@/db/client";
import { approvals, type Approval, type NewApproval } from "@/db/schema";

type CreateApprovalInput = Omit<NewApproval, "id" | "createdAt"> & { id?: string };

export function createApprovalRepository(db: FixFlowDatabase) {
  return {
    async create(input: CreateApprovalInput): Promise<Approval> {
      const [approval] = await db
        .insert(approvals)
        .values({ ...input, id: input.id ?? randomUUID() })
        .returning();
      return approval;
    },

    async findByInvestigation(investigationId: string): Promise<Approval | undefined> {
      return db.query.approvals.findFirst({ where: eq(approvals.investigationId, investigationId) });
    },
  };
}
