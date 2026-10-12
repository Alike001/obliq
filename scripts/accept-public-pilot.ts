import { mkdir } from "node:fs/promises";
import { chromium, type BrowserContext } from "playwright-core";

const baseUrl =
  process.env.OBLIQ_PILOT_ACCEPTANCE_URL ?? "http://127.0.0.1:3102";
const mutationOrigin =
  process.env.OBLIQ_PILOT_ACCEPTANCE_ORIGIN ?? new URL(baseUrl).origin;
const chrome = process.env.OBLIQ_ACCEPTANCE_CHROME ?? "/usr/bin/google-chrome";
const artifactDirectory = "artifacts/public-pilot";

function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function newGuestCookie() {
  const response = await fetch(baseUrl + "/pilot/start", {
    method: "POST",
    headers: { origin: mutationOrigin },
    redirect: "manual",
  });
  check(response.status === 303, "Pilot session creation did not redirect");
  const raw = response.headers.get("set-cookie") ?? "";
  const attributes = raw.toLowerCase();
  check(
    attributes.includes("httponly") &&
      attributes.includes("secure") &&
      attributes.includes("samesite=lax"),
    "Pilot cookie security attributes are missing",
  );
  const pair = raw.split(";", 1)[0] ?? "";
  const separator = pair.indexOf("=");
  check(separator > 0, "Pilot cookie was not returned");
  return { name: pair.slice(0, separator), value: pair.slice(separator + 1) };
}

async function contextFor(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  viewport: { width: number; height: number },
) {
  const cookie = await newGuestCookie();
  const context = await browser.newContext({
    viewport,
    ignoreHTTPSErrors: true,
  });
  await context.addCookies([
    {
      ...cookie,
      domain: new URL(baseUrl).hostname,
      path: "/",
      httpOnly: true,
      // The local acceptance server is HTTP. The response itself was checked
      // above for Secure; this browser-only injection simulates Render's TLS
      // termination without weakening the application cookie.
      secure: new URL(baseUrl).protocol === "https:",
      sameSite: "Lax",
    },
  ]);
  return context;
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
  executablePath: chrome,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-zygote",
    "--single-process",
    "--renderer-process-limit=2",
  ],
});

try {
  const trialA = await contextFor(browser, { width: 1440, height: 1000 });
  const pageA = await trialA.newPage();

  await pageA.goto(baseUrl + "/app");
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

  const trialB = await contextFor(browser, { width: 390, height: 844 });
  const crossTenant = await trialB.request.get(vendorUrl);
  const crossTenantBody = await crossTenant.text();
  check(
    (crossTenant.status() === 404 ||
      crossTenantBody.includes("There is no record at this address.")) &&
      !crossTenantBody.includes("Northstar Studio — fictional"),
    "Trial B could read Trial A's vendor",
  );
  const mobileB = await trialB.newPage();
  await mobileB.goto(baseUrl + "/app");
  await mobileB.screenshot({
    path: artifactDirectory + "/isolated-mobile.png",
  });
  await assertNoBrowserSecrets(trialB);

  console.log(
    JSON.stringify({
      status: "PASS",
      persistence: "PASS",
      tenantIsolation: "PASS",
      policyEvaluation: "PASS",
      scriptReadableSessionMaterial: "ABSENT",
      screenshots: [
        artifactDirectory + "/obligation-desktop.png",
        artifactDirectory + "/isolated-mobile.png",
      ],
    }),
  );
} finally {
  await browser.close();
}
