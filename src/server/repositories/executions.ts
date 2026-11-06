import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { FixFlowDatabase } from "@/db/client";
import { executions, type Execution, type NewExecution } from "@/db/schema";

type CreateExecutionInput = Omit<NewExecution, "id" | "createdAt"> & { id?: string };

export function createExecutionRepository(db: FixFlowDatabase) {
  return {
    async create(input: CreateExecutionInput): Promise<Execution> {
      const [execution] = await db
        .insert(executions)
        .values({ ...input, id: input.id ?? randomUUID() })
        .returning();
      return execution;
    },

    async findByApproval(approvalId: string): Promise<Execution | undefined> {
      return db.query.executions.findFirst({ where: eq(executions.approvalId, approvalId) });
    },
  };
}
