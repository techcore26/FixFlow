import { assertLocalMutationRequest } from "@/server/http/mutation-guard";
import { apiHandler, apiJson, getIncidentService, parseJson } from "@/server/http/responses";
import { approvalSchema } from "@/validation/incidents";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    assertLocalMutationRequest(request);
    const { id } = await context.params;
    const service = await getIncidentService();
    return apiJson(await service.approve(id, await parseJson(request, approvalSchema)));
  });
}
