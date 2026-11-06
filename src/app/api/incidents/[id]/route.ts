import { apiHandler, apiJson, getIncidentService } from "@/server/http/responses";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    const { id } = await context.params;
    const service = await getIncidentService();
    return apiJson(await service.details(id));
  });
}
