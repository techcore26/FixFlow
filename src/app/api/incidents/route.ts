import { createIncidentSchema } from "@/validation/incidents";
import { assertLocalMutationRequest } from "@/server/http/mutation-guard";
import { apiHandler, apiJson, getIncidentService, parseJson } from "@/server/http/responses";

export async function GET() {
  return apiHandler(async () => {
    const service = await getIncidentService();
    return apiJson(await service.list());
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    assertLocalMutationRequest(request);
    const service = await getIncidentService();
    const input = await parseJson(request, createIncidentSchema);
    return apiJson(await service.create(input), { status: 201 });
  });
}
