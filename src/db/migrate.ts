import path from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createDatabase } from "./client";

export async function migrateDatabase(databaseUrl?: string): Promise<void> {
  const database = createDatabase(databaseUrl);

  try {
    await database.client.execute("PRAGMA foreign_keys = ON");
    await migrate(database.db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  } finally {
    database.client.close();
  }
}

if (process.argv[1]?.endsWith(path.join("src", "db", "migrate.ts"))) {
  migrateDatabase()
    .then(() => console.log("FixFlow database migrations applied."))
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
