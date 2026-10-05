import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./packages/database/src/schema/index.ts",
  out: "./packages/database/drizzle",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://obliq:obliq@localhost:5433/obliq",
  },
  strict: true,
  verbose: true,
});
