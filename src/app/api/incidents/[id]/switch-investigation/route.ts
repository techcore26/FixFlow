import { randomUUID } from "node:crypto";
import { getSwitchConfig } from "@/config/switch";
import { assertLocalMutationRequest } from "@/server/http/mutation-guard";
import { apiHandler, apiJson, getIncidentService, parseJson } from "@/server/http/responses";
import { SwitchIntegrationUnavailableError } from "@/server/incidents/errors";
import { queueSwitchInvestigationSchema } from "@/validation/incidents";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    assertLocalMutationRequest(request);
    const config = getSwitchConfig();
    if (!config.enabled) throw new SwitchIntegrationUnavailableError();
    const { id } = await context.params;
    const input = await parseJson(request, queueSwitchInvestigationSchema);
    const service = await getIncidentService();
    return apiJson(await service.queueSwitchInvestigation(id, input, { requestId: randomUUID(), expectedRoomId: config.roomId, expectedSenderId: config.targetAgentId, deadlineAt: new Date(Date.now() + 10 * 60_000) }));
  });
}
