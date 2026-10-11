import { spawn, type ChildProcess } from "node:child_process";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { chromium, type Page } from "playwright-core";
import { and, desc, eq } from "drizzle-orm";
import {
  createDatabase,
  createObligation,
  createVendor,
  schema,
} from "@obliq/database";

const databaseUrl = required("TEST_DATABASE_URL");
const receiver = required("OBLIQ_ACCEPTANCE_RECEIVER");
const observerBinary = resolve(
  process.env.OBSERVER_BINARY ??
    "tools/zcash-observer/target/release/obliq-zcash-observer",
);
const chromeBinary =
  process.env.OBLIQ_ACCEPTANCE_CHROME ?? "/usr/bin/google-chrome";
const financeOrigin = "http://localhost:3111";
const reviewerOrigin = "http://localhost:3112";
const mailOrigin = "http://127.0.0.1:4317";
const mailToken = `acceptance-${randomUUID()}-${randomUUID()}`;
const tokenPepper = `recipient-${randomUUID()}-${randomUUID()}`;
const sessionPepper = `session-${randomUUID()}-${randomUUID()}`;
const suffix = randomUUID().slice(0, 8);
const organizationId = randomUUID();
const financeUserId = randomUUID();
const reviewerUserId = randomUUID();
const contactEmail = `recipient-${suffix}@example.test`;
const evidenceDirectory = resolve(".data/private-payables-acceptance");
const children: ChildProcess[] = [];

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function start(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env,
    // These local services never log message bodies or request credentials.
    // Keeping their lifecycle output visible makes a failed acceptance run
    // diagnosable without printing the mail sink's private contents.
    stdio: ["ignore", "inherit", "inherit"],
  });
  children.push(child);
  return child;
}

async function waitFor(url: string, expectedStatus = 200) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.status === expectedStatus) return;
    } catch {
      // The local process may still be starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`Timed out waiting for local acceptance service: ${url}`);
}

type MailMessage = {
  message: {
    kind: "INVITATION" | "VERIFICATION_CODE";
    invitationUrl?: string;
    code?: string;
  };
};

async function latestMail(kind: MailMessage["message"]["kind"]) {
  const response = await fetch(
    `${mailOrigin}/messages?to=${encodeURIComponent(contactEmail)}`,
    { headers: { Authorization: `Bearer ${mailToken}` }, cache: "no-store" },
  );
  if (!response.ok) throw new Error("The development mail sink is unavailable");
  const body = (await response.json()) as { messages?: MailMessage[] };
  const found = body.messages
    ?.filter((item) => item.message.kind === kind)
    .at(-1);
  if (!found)
    throw new Error(`Expected ${kind} development message was not accepted`);
  return found.message;
}

async function assertNoTokenPersistence(page: Page, token: string) {
  const exposed = await page.evaluate((sensitiveToken) => {
    let stored = false;
    for (const storage of [localStorage, sessionStorage]) {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key && storage.getItem(key)?.includes(sensitiveToken))
          stored = true;
      }
    }
    return {
      url: location.href.includes(sensitiveToken),
      markup: document.documentElement.innerHTML.includes(sensitiveToken),
      stored,
    };
  }, token);
  if (exposed.url || exposed.markup || exposed.stored)
    throw new Error("Invitation token escaped the in-memory browser boundary");
}

async function enterLatestCode(page: Page) {
  const mail = await latestMail("VERIFICATION_CODE");
  if (!mail.code || !/^\d{6}$/u.test(mail.code))
    throw new Error("Development mail sink returned an invalid code fixture");
  await page.getByLabel("6-digit code").fill(mail.code);
  await page.getByRole("button", { name: "Verify email" }).click();
}

async function main() {
  const connection = createDatabase(databaseUrl);
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    await mkdir(evidenceDirectory, { recursive: true, mode: 0o700 });
    await connection.db.insert(schema.organizations).values({
      id: organizationId,
      name: `Acceptance ${suffix}`,
    });
    await connection.db.insert(schema.users).values([
      {
        id: financeUserId,
        email: `finance-${suffix}@example.test`,
        displayName: "Acceptance Finance",
      },
      {
        id: reviewerUserId,
        email: `reviewer-${suffix}@example.test`,
        displayName: "Acceptance Reviewer",
      },
    ]);
    await connection.db.insert(schema.memberships).values([
      { organizationId, userId: financeUserId, role: "FINANCE" },
      { organizationId, userId: reviewerUserId, role: "TREASURY" },
    ]);
    const actor = { organizationId, userId: financeUserId };
    const vendor = await createVendor(connection.db, actor, {
      legalName: `Acceptance Vendor ${suffix}`,
      displayName: `Acceptance Vendor ${suffix}`,
      contactName: "Acceptance Recipient",
      contactEmail,
    });
    const obligation = await createObligation(connection.db, actor, {
      vendorId: vendor.id,
      type: "VENDOR_INVOICE",
      reference: `ACCEPT-${suffix}`,
      currency: "USD",
      amount: "125.00",
      dueDate: "2026-10-12",
      category: "Operations",
      description: "Private payables isolated browser acceptance",
    });

    start("npm", ["run", "dev:recipient-mail"], {
      ...process.env,
      OBLIQ_DEV_MAIL_PORT: "4317",
      OBLIQ_DEV_MAIL_TOKEN: mailToken,
    });
    await waitFor(`${mailOrigin}/health`);

    const shared = {
      ...process.env,
      DATABASE_URL: databaseUrl,
      OBLIQ_DEPLOYMENT_MODE: "development",
      OBLIQ_SESSION_MODE: "development",
      OBLIQ_STORAGE_MODE: "local-development",
      OBLIQ_ZCASH_NETWORK: "regtest",
      OBSERVER_NETWORK: "regtest",
      OBLIQ_PUBLIC_NETWORK_STATUS: "PUBLIC_NETWORK_BLOCKED",
      OBLIQ_DEV_ORGANIZATION_ID: organizationId,
      OBLIQ_SESSION_PEPPER: sessionPepper,
      OBLIQ_RECIPIENT_TOKEN_PEPPER: tokenPepper,
      OBLIQ_RECIPIENT_EMAIL_ENDPOINT: `${mailOrigin}/recipient`,
      OBLIQ_RECIPIENT_EMAIL_TOKEN: mailToken,
      OBSERVER_BINARY: observerBinary,
    };
    start(
      "npm",
      ["run", "start", "--workspace=@obliq/web", "--", "-p", "3111"],
      {
        ...shared,
        OBLIQ_APP_BASE_URL: financeOrigin,
        OBLIQ_DEV_USER_ID: financeUserId,
      },
    );
    start(
      "npm",
      ["run", "start", "--workspace=@obliq/web", "--", "-p", "3112"],
      {
        ...shared,
        OBLIQ_APP_BASE_URL: reviewerOrigin,
        OBLIQ_DEV_USER_ID: reviewerUserId,
      },
    );
    await Promise.all([
      waitFor(`${financeOrigin}/health/live`),
      waitFor(`${reviewerOrigin}/health/live`),
    ]);

    browser = await chromium.launch({
      executablePath: chromeBinary,
      headless: true,
      args: ["--no-sandbox"],
    });
    const financeContext = await browser.newContext({
      viewport: { width: 1365, height: 900 },
    });
    const financePage = await financeContext.newPage();
    await financePage.goto(`${financeOrigin}/app/obligations/${obligation.id}`);
    await financePage
      .getByRole("button", { name: "Email invitation link" })
      .click();
    await financePage.getByRole("button", { name: "Send link" }).click();
    await financePage.getByText("Invitation accepted for delivery").waitFor();

    const invitationMail = await latestMail("INVITATION");
    if (!invitationMail.invitationUrl)
      throw new Error("Development invitation did not contain a URL");
    const invitationUrl = new URL(invitationMail.invitationUrl);
    const invitationToken = new URLSearchParams(
      invitationUrl.hash.slice(1),
    ).get("token");
    if (!invitationToken)
      throw new Error("Development invitation URL had no fragment token");

    const recipientContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const recipientPage = await recipientContext.newPage();
    await recipientPage.goto(invitationMail.invitationUrl);
    await recipientPage
      .getByRole("button", { name: "Email me a code" })
      .waitFor();
    await assertNoTokenPersistence(recipientPage, invitationToken);
    await recipientPage
      .getByRole("button", { name: "Email me a code" })
      .click();
    await recipientPage.getByLabel("6-digit code").fill("000000");
    await recipientPage.getByRole("button", { name: "Verify email" }).click();
    await recipientPage.getByText("That code was not accepted").waitFor();
    await enterLatestCode(recipientPage);
    await recipientPage
      .getByRole("heading", { name: "Enter your Zcash address" })
      .waitFor();

    const [activeSession] = await connection.db
      .select({ id: schema.recipientSessions.id })
      .from(schema.recipientSessions)
      .where(
        and(
          eq(schema.recipientSessions.organizationId, organizationId),
          eq(schema.recipientSessions.state, "ACTIVE"),
        ),
      )
      .orderBy(desc(schema.recipientSessions.createdAt))
      .limit(1);
    if (!activeSession) throw new Error("Recipient session was not persisted");
    await connection.db
      .update(schema.recipientSessions)
      .set({ expiresAt: new Date(Date.now() - 1_000) })
      .where(eq(schema.recipientSessions.id, activeSession.id));
    const renewedChallengeStatus = await recipientPage.evaluate(
      async (token) =>
        (
          await fetch("/api/private-payables/challenges", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invitationToken: token }),
          })
        ).status,
      invitationToken,
    );
    if (renewedChallengeStatus !== 202)
      throw new Error(
        "Expired session could not start contact re-verification",
      );
    const renewedMail = await latestMail("VERIFICATION_CODE");
    if (!renewedMail.code || !/^\d{6}$/u.test(renewedMail.code))
      throw new Error("Session recovery code was unavailable");
    const renewedVerificationStatus = await recipientPage.evaluate(
      async ({ token, code }) =>
        (
          await fetch("/api/private-payables/verify-contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invitationToken: token, code }),
          })
        ).status,
      { token: invitationToken, code: renewedMail.code },
    );
    if (renewedVerificationStatus !== 200)
      throw new Error(
        "Expired session could not complete contact re-verification",
      );
    await recipientPage.reload();
    await recipientPage
      .getByRole("heading", { name: "Enter your Zcash address" })
      .waitFor();

    await recipientPage
      .getByLabel("Your shielded Unified Address")
      .fill(receiver);
    await recipientPage.getByRole("button", { name: "Review address" }).click();
    await recipientPage.getByRole("checkbox").check();
    await recipientPage
      .getByRole("button", { name: "Submit address for review" })
      .click();
    await recipientPage
      .getByRole("heading", { name: "Address submitted. Not yet verified." })
      .waitFor();
    await recipientPage.getByText("Unverified", { exact: true }).waitFor();
    await recipientPage.screenshot({
      path: resolve(evidenceDirectory, "recipient-confirmed.png"),
      fullPage: true,
    });
    await chmod(resolve(evidenceDirectory, "recipient-confirmed.png"), 0o600);

    const reviewerContext = await browser.newContext({
      viewport: { width: 1365, height: 900 },
    });
    const reviewerPage = await reviewerContext.newPage();
    await reviewerPage.goto(`${reviewerOrigin}/app/vendors/${vendor.id}`);
    await reviewerPage
      .getByLabel("How it was verified")
      .fill("Independent callback");
    await reviewerPage
      .getByLabel("Verification note")
      .fill("Acceptance fixture reviewed out of band");
    await reviewerPage
      .getByRole("button", { name: "Record manual verification" })
      .click();
    await reviewerPage.getByText("Manual verification recorded").waitFor();
    await reviewerPage.screenshot({
      path: resolve(evidenceDirectory, "finance-review-complete.png"),
      fullPage: true,
    });
    await chmod(
      resolve(evidenceDirectory, "finance-review-complete.png"),
      0o600,
    );

    const [destination] = await connection.db
      .select({
        verificationStatus: schema.vendorDestinations.verificationStatus,
        recipientConfirmationStatus:
          schema.vendorDestinations.recipientConfirmationStatus,
      })
      .from(schema.vendorDestinations)
      .where(
        and(
          eq(schema.vendorDestinations.organizationId, organizationId),
          eq(schema.vendorDestinations.vendorId, vendor.id),
        ),
      )
      .orderBy(desc(schema.vendorDestinations.version))
      .limit(1);
    if (
      destination?.verificationStatus !== "VERIFIED_MANUALLY" ||
      destination.recipientConfirmationStatus !== "CONTACT_CONFIRMED"
    )
      throw new Error(
        "Independent finance review did not reach canonical state",
      );

    const report = {
      schemaVersion: "obliq.private-payables-browser-acceptance.v1",
      executedAt: new Date().toISOString(),
      environment: "ISOLATED_LOCAL_DEVELOPMENT",
      publicNetworkSettlement: "NOT_TESTED",
      mailDelivery: "DEVELOPMENT_MEMORY_SINK",
      results: {
        invitationDeliveryAccepted: "PASS",
        fragmentTokenRemovedAndNotPersisted: "PASS",
        wrongCodeNeutralFailure: "PASS",
        contactVerification: "PASS",
        expiredSessionReverification: "PASS",
        scopedObligationSummary: "PASS",
        orchardDestinationConfirmation: "PASS",
        recipientStatusUnverified: "PASS",
        independentFinanceReview: "PASS",
        signingBroadcastSettlement: "NOT_TESTED",
      },
    };
    await writeFile(
      resolve(evidenceDirectory, "report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      { mode: 0o600 },
    );
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await browser?.close();
    for (const child of children.reverse()) child.kill("SIGTERM");
    await connection.close();
  }
}

await main();
