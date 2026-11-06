import { assertLocalMutationRequest } from "@/server/http/mutation-guard";
import { apiHandler, apiJson, getIncidentService, parseJson } from "@/server/http/responses";
import { acknowledgementSchema } from "@/validation/incidents";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    assertLocalMutationRequest(request);
    const { id } = await context.params;
    return apiJson(await (await getIncidentService()).acknowledge(id, await parseJson(request, acknowledgementSchema)));
  });
}
