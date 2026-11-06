import { ZodError, type ZodTypeAny, type infer as Infer } from "zod";
import { OPERATOR_MODE, OPERATOR_MODE_WARNING } from "@/config/operator";
import { getDatabase } from "@/db/client";
import { IncidentError } from "@/server/incidents/errors";
import { IncidentService } from "@/server/incidents/service";

export async function getIncidentService(): Promise<IncidentService> {
  const database = getDatabase();
  await database.ready;
  return new IncidentService(database.db);
}

export async function parseJson<T extends ZodTypeAny>(request: Request, schema: T): Promise<Infer<T>> {
  return schema.parse(await request.json());
}

export function apiJson(data: unknown, init?: ResponseInit): Response {
  return Response.json(
    { data, operatorMode: OPERATOR_MODE, warning: OPERATOR_MODE_WARNING },
    init,
  );
}

export async function apiHandler(operation: () => Promise<Response>): Promise<Response> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", issues: error.issues } },
        { status: 400 },
      );
    }
    if (error instanceof IncidentError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    if (error instanceof SyntaxError) {
      return Response.json(
        { error: { code: "INVALID_JSON", message: "Request body must contain valid JSON." } },
        { status: 400 },
      );
    }
    console.error("Unhandled API error", error);
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "The request could not be completed." } },
      { status: 500 },
    );
  }
}
