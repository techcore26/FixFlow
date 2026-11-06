import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { getDatabaseUrl } from "@/config/database";
import * as schema from "./schema";

function ensureDatabaseDirectory(url: string): void {
  if (!url.startsWith("file:")) return;

  const databasePath = url.slice("file:".length);
  if (databasePath && databasePath !== ":memory:") {
    mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true });
  }
}

export function createDatabase(databaseUrl?: string) {
  const url = getDatabaseUrl(databaseUrl);
  ensureDatabaseDirectory(url);

  const client = createClient({ url });
  const db = drizzle(client, { schema });
  const ready = client.execute("PRAGMA foreign_keys = ON");

  return { client, db, ready, url };
}

export type FixFlowDatabase = ReturnType<typeof createDatabase>["db"];

let singleton: ReturnType<typeof createDatabase> | undefined;

export function getDatabase() {
  singleton ??= createDatabase();
  return singleton;
}
