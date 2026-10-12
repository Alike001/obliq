import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { chromium, type BrowserContext, type Page } from "playwright-core";

const baseUrl =
  process.env.OBLIQ_PILOT_ACCEPTANCE_URL ?? "http://127.0.0.1:3102";
const mutationOrigin =
  process.env.OBLIQ_PILOT_ACCEPTANCE_ORIGIN ?? new URL(baseUrl).origin;
const chrome = process.env.OBLIQ_ACCEPTANCE_CHROME;
const bundledChrome = chromium.executablePath();
const browserExecutable = chrome
  ? chrome
  : existsSync(bundledChrome)
    ? undefined
    : existsSync("/usr/bin/google-chrome")
      ? "/usr/bin/google-chrome"
      : undefined;
const artifactDirectory = "artifacts/public-pilot";
const browserEvents: Array<{
  context: string;
  kind: "crash" | "pageerror";
  stage: string;
  detail?: string;
}> = [];
let acceptanceStage = "launch";

function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function safeDiagnostic(value: unknown) {
  const message = value instanceof Error ? value.message : String(value);
  return message
    .replace(/([?#])[A-Za-z0-9_%+./=&-]+/gu, "$1[redacted]")
    .replace(/[A-Za-z0-9_-]{32,}/gu, "[redacted]")
    .slice(0, 600);
}

function monitorPage(page: Page, context: string) {
  page.on("crash", () => {
    browserEvents.push({ context, kind: "crash", stage: acceptanceStage });
  });
  page.on("pageerror", (error) => {
    browserEvents.push({
      context,
      kind: "pageerror",
      stage: acceptanceStage,
      detail: safeDiagnostic(error),
    });
  });
}

async function contextFor(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  viewport: { width: number; height: number },
  label: string,
) {
  const context = await browser.newContext({
    viewport,
    ignoreHTTPSErrors: true,
  });
  const externalFontRequests: string[] = [];
  context.on("request", (request) => {
    const hostname = new URL(request.url()).hostname;
    if (hostname === "fonts.googleapis.com" || hostname === "fonts.gstatic.com")
      externalFontRequests.push(hostname);
  });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(90_000);
  monitorPage(page, label);
  acceptanceStage = `${label}:pilot-entry`;
  const entry = await page.goto(baseUrl + "/pilot", {
    waitUntil: "domcontentloaded",
  });
  check(entry, "Pilot entry did not return a response");
  check(entry.ok(), "Pilot entry did not load");
  check(
    entry.headers()["content-security-policy"]?.includes("form-action 'self'"),
    "Pilot entry is missing the strict form-action policy",
  );
  const form = await page
    .locator('form[action="/pilot/start"]')
    .evaluate((element) => ({
      action: (element as HTMLFormElement).action,
      method: (element as HTMLFormElement).method,
      origin: window.location.origin,
    }));
  check(form.origin === mutationOrigin, "Pilot document origin is unexpected");
  check(
    new URL(form.action).origin === mutationOrigin && form.method === "post",
    "Pilot start form is not an HTTPS same-origin POST",
  );

  acceptanceStage = `${label}:workspace-start`;
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/pilot/start" &&
      response.request().method() === "POST",
  );
  await Promise.all([
    page.waitForURL(new URL("/app", baseUrl).href),
    page.getByRole("button", { name: /Create isolated workspace/u }).click(),
  ]);
  const response = await responsePromise;
  check(response.status() === 303, "Pilot session creation did not redirect");
  const location = response.headers()["location"];
  check(location, "Pilot redirect location is missing");
  const redirect = new URL(location, baseUrl);
  check(
    redirect.protocol === "https:" &&
      redirect.origin === mutationOrigin &&
      redirect.pathname === "/app",
    "Pilot redirect is not HTTPS and same-origin",
  );
  const sessionCookie = (await context.cookies(baseUrl)).find((cookie) =>
    cookie.name.endsWith("obliq_session"),
  );
  check(
    sessionCookie?.httpOnly &&
      sessionCookie.secure &&
      sessionCookie.sameSite === "Lax",
    "Pilot cookie security attributes are missing",
  );
  check(externalFontRequests.length === 0, "Pilot requested an external font");
  return { context, page };
}

async function assertNoBrowserSecrets(context: BrowserContext) {
  for (const page of context.pages()) {
    const storage = await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
      cookie: document.cookie,
    }));
    check(storage.local.length === 0, "Pilot wrote local storage");
    check(storage.session.length === 0, "Pilot wrote session storage");
    check(
      storage.cookie === "",
      "HttpOnly pilot cookie became script-readable",
    );
  }
}

await mkdir(artifactDirectory, { recursive: true });
const browser = await chromium.launch({
  ...(browserExecutable ? { executablePath: browserExecutable } : {}),
  headless: true,
});

try {
  const desktop = await contextFor(
    browser,
    { width: 1440, height: 1000 },
    "trial-a-desktop",
  );
  const trialA = desktop.context;
  const pageA = desktop.page;

  acceptanceStage = "trial-a:vendor";
  await pageA
    .getByRole("link", { name: "Vendors", exact: true })
    .first()
    .click();
  await pageA.getByRole("link", { name: "New vendor" }).click();
  await pageA.getByLabel("Display name").fill("Northstar Studio — fictional");
  await pageA.getByLabel("Legal name").fill("Northstar Studio Test LLC");
  await pageA.getByLabel("Category (optional)").fill("Design services");
  await Promise.all([
    pageA.waitForURL(/\/app\/vendors\/[0-9a-f-]+\?created=1$/u),
    pageA.getByRole("button", { name: "Create vendor" }).click(),
  ]);
  const vendorUrl = pageA.url().replace("?created=1", "");
  await pageA.reload();
  await pageA.getByText("Northstar Studio — fictional").waitFor();

  acceptanceStage = "trial-a:obligation";
  await pageA.goto(baseUrl + "/app/obligations/new");
  check(
    pageA.url().includes("/app/obligations/new"),
    "Trial A lost its isolated session before obligation creation",
  );
  await pageA.getByRole("heading", { name: "Record an obligation" }).waitFor();
  await pageA
    .locator('select[name="vendorId"]')
    .selectOption({ label: "Northstar Studio — fictional" });
  await pageA.getByLabel("Invoice / reference number").fill("PILOT-INV-001");
  await pageA.locator('input[name="amount"]').fill("1250.00");
  await pageA.getByLabel("Due date").fill("2026-11-01");
  await pageA.getByLabel("Category").fill("Design services");
  await pageA
    .getByLabel("Business purpose")
    .fill("Fictional product design invoice");
  await pageA.getByRole("button", { name: "Create obligation" }).click();
  await pageA.waitForURL(/\/app\/obligations\/[0-9a-f-]+\?created=1$/u);
  const obligationUrl = pageA.url().replace("?created=1", "");
  await pageA.reload();
  await pageA.getByText("PILOT-INV-001", { exact: true }).first().waitFor();
  await Promise.all([
    pageA.waitForURL(/\?controls=evaluated$/u),
    pageA.getByRole("button", { name: "Evaluate controls" }).click(),
  ]);
  await pageA
    .getByText("Guest trials cannot provide genuine human approval")
    .first()
    .waitFor();

  acceptanceStage = "trial-a:duplicate";
  await pageA.goto(baseUrl + "/app/obligations/new");
  await pageA
    .locator('select[name="vendorId"]')
    .selectOption({ label: "Northstar Studio — fictional" });
  await pageA.getByLabel("Invoice / reference number").fill("PILOT-INV-001");
  await pageA.locator('input[name="amount"]').fill("1250.00");
  await pageA.getByLabel("Due date").fill("2026-11-01");
  await pageA.getByLabel("Category").fill("Design services");
  await pageA
    .getByLabel("Business purpose")
    .fill("Fictional product design invoice");
  await Promise.all([
    pageA.waitForURL(obligationUrl + "?duplicate=blocked"),
    pageA.getByRole("button", { name: "Create obligation" }).click(),
  ]);
  await pageA.getByText("Nothing new was created").waitFor();
  await pageA.screenshot({
    path: artifactDirectory + "/obligation-desktop.png",
  });
  await assertNoBrowserSecrets(trialA);
  await trialA.close();

  const mobile = await contextFor(
    browser,
    { width: 390, height: 844 },
    "trial-b-mobile",
  );
  const trialB = mobile.context;
  acceptanceStage = "trial-b:tenant-isolation";
  const crossTenant = await trialB.request.get(vendorUrl);
  const crossTenantBody = await crossTenant.text();
  check(
    (crossTenant.status() === 404 ||
      crossTenantBody.includes("There is no record at this address.")) &&
      !crossTenantBody.includes("Northstar Studio — fictional"),
    "Trial B could read Trial A's vendor",
  );
  const mobileB = mobile.page;
  await mobileB.goto(baseUrl + "/app");
  await mobileB.screenshot({
    path: artifactDirectory + "/isolated-mobile.png",
  });
  acceptanceStage = "trial-b:workspace-reset";
  const resetResponsePromise = mobileB.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/pilot/reset" &&
      response.request().method() === "POST",
  );
  await Promise.all([
    mobileB.waitForURL(new URL("/app", baseUrl).href),
    mobileB.getByRole("button", { name: "Reset workspace" }).click(),
  ]);
  const resetResponse = await resetResponsePromise;
  check(
    resetResponse.status() === 303,
    `Pilot reset did not redirect (status ${resetResponse.status()})`,
  );
  const resetLocation = resetResponse.headers()["location"];
  check(resetLocation, "Pilot reset redirect location is missing");
  const resetRedirect = new URL(resetLocation, baseUrl);
  check(
    resetRedirect.protocol === "https:" &&
      resetRedirect.origin === mutationOrigin &&
      resetRedirect.pathname === "/app",
    "Pilot reset redirect is not HTTPS and same-origin",
  );
  await assertNoBrowserSecrets(trialB);
  check(
    !browserEvents.some((event) => event.kind === "crash"),
    "A browser page crashed during acceptance",
  );

  console.log(
    JSON.stringify({
      status: "PASS",
      persistence: "PASS",
      tenantIsolation: "PASS",
      policyEvaluation: "PASS",
      scriptReadableSessionMaterial: "ABSENT",
      onboardingForm: "PASS",
      redirectBoundary: "HTTPS_SAME_ORIGIN",
      resetRedirectBoundary: "HTTPS_SAME_ORIGIN",
      externalFontRequests: "ABSENT",
      screenshots: [
        artifactDirectory + "/obligation-desktop.png",
        artifactDirectory + "/isolated-mobile.png",
      ],
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      status: "FAIL",
      stage: acceptanceStage,
      error: safeDiagnostic(error),
      browserEvents,
    }),
  );
  throw new Error(`Pilot acceptance failed at ${acceptanceStage}`);
} finally {
  await browser.close();
}
