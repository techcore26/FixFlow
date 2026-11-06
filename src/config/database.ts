import path from "node:path";

export const DEFAULT_DATABASE_PATH = path.join(process.cwd(), "data", "fixflow.db");

export function getDatabaseUrl(override?: string): string {
  return override ?? process.env.FIXFLOW_DATABASE_URL ?? `file:${DEFAULT_DATABASE_PATH}`;
}
