import { assertLocalMutationRequest } from "@/server/http/mutation-guard";
import { apiHandler, apiJson, getIncidentService, parseJson } from "@/server/http/responses";
import { investigationResultSchema } from "@/validation/incidents";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    assertLocalMutationRequest(request);
    const { id } = await context.params;
    const service = await getIncidentService();
    return apiJson(await service.recordInvestigationResult(id, await parseJson(request, investigationResultSchema)));
  });
}
