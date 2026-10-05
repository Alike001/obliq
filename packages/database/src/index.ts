import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDatabase(databaseUrl: string) {
  const client = postgres(databaseUrl, { max: 10, prepare: false });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}

export { schema };
export * from "./repositories";
