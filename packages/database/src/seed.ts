import { createDatabase, schema } from "./index";
import { createDefaultPolicy } from "./repositories";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    "DATABASE_URL is required; seed never uses fallback persistence",
  );

const organizationId =
  process.env.OBLIQ_DEV_ORGANIZATION_ID ??
  "00000000-0000-4000-8000-000000000002";
const userId =
  process.env.OBLIQ_DEV_USER_ID ?? "00000000-0000-4000-8000-000000000001";
const { db, close } = createDatabase(databaseUrl);

try {
  await db.transaction(async (tx) => {
    await tx
      .insert(schema.organizations)
      .values({ id: organizationId, name: "Obliq Development" })
      .onConflictDoNothing();
    await tx
      .insert(schema.users)
      .values({
        id: userId,
        email: "operator@obliq.local",
        displayName: "Development Operator",
      })
      .onConflictDoNothing();
    await tx
      .insert(schema.memberships)
      .values({ organizationId, userId, role: "OWNER", status: "ACTIVE" })
      .onConflictDoNothing();
  });
  process.stdout.write(`Seeded development tenant ${organizationId}\n`);
  await createDefaultPolicy(db, { organizationId, userId });
  process.stdout.write("Seeded default versioned control policy\n");
} finally {
  await close();
}
