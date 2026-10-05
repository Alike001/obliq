import "server-only";
import { createDatabase } from "@obliq/database";

let connection: ReturnType<typeof createDatabase> | undefined;

export function getDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    throw new Error(
      "DATABASE_URL is required. Obliq does not fall back to fake persistence.",
    );
  connection ??= createDatabase(databaseUrl);
  return connection.db;
}
