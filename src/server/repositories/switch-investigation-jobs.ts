import { and, asc, eq, inArray, lt } from "drizzle-orm";
import type { FixFlowDatabase } from "@/db/client";
import { switchInvestigationJobs } from "@/db/schema";

export function createSwitchInvestigationJobRepository(db: FixFlowDatabase) {
  return {
    async claimNext(workerId: string, leaseUntil: Date) {
      return db.transaction(async (tx) => {
        const [job] = await tx.select().from(switchInvestigationJobs).where(eq(switchInvestigationJobs.status, "PENDING")).orderBy(asc(switchInvestigationJobs.createdAt)).limit(1);
        if (!job) return null;
        const [claimed] = await tx.update(switchInvestigationJobs).set({ status: "DISPATCHING", leaseOwner: workerId, leaseExpiresAt: leaseUntil, attempts: job.attempts + 1, updatedAt: new Date() }).where(and(eq(switchInvestigationJobs.id, job.id), eq(switchInvestigationJobs.status, "PENDING"))).returning();
        return claimed ?? null;
      });
    },
    async findByRequestId(requestId: string) { return (await db.select().from(switchInvestigationJobs).where(eq(switchInvestigationJobs.requestId, requestId)).limit(1))[0] ?? null; },
    async expire(now: Date) {
      const timedOut = await db.update(switchInvestigationJobs)
        .set({
          status: "TIMED_OUT",
          errorCode: "TIMEOUT",
          errorMessage: "No validated Switch response arrived before the deadline.",
          updatedAt: now,
          leaseOwner: null,
          leaseExpiresAt: null,
        })
        .where(and(
          inArray(switchInvestigationJobs.status, ["PENDING", "DISPATCHING", "SENT", "DELIVERY_UNKNOWN"]),
          lt(switchInvestigationJobs.deadlineAt, now),
        ))
        .returning();

      const leaseExpired = await db.update(switchInvestigationJobs)
        .set({
          status: "DELIVERY_UNKNOWN",
          errorCode: "LEASE_EXPIRED",
          errorMessage: "Worker lease expired; Switch message delivery may have occurred.",
          updatedAt: now,
          leaseOwner: null,
          leaseExpiresAt: null,
        })
        .where(and(
          eq(switchInvestigationJobs.status, "DISPATCHING"),
          lt(switchInvestigationJobs.leaseExpiresAt, now),
        ))
        .returning();

      return [...timedOut, ...leaseExpired];
    },
  };
}
