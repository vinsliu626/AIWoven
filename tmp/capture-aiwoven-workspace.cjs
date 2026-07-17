const { chromium } = require("@playwright/test");
const { loadEnvConfig } = require("@next/env");
const path = require("node:path");

loadEnvConfig(process.cwd(), true);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const output = path.resolve("output");
const routes = ["chat", "ai-note", "ai-detector", "ai-study", "ai-humanizer", "converter", "account"];

async function signIn(page, email, password) {
  await page.goto(`${baseURL}/chat`, { waitUntil: "networkidle" });
  await page.getByTestId("header-auth-signin").click();
  const form = page.getByTestId("local-credentials-form");
  await form.getByLabel("Email", { exact: true }).fill(email);
  await form.getByLabel("Password", { exact: true }).fill(password);
  await form.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByTestId("header-auth-account").waitFor({ state: "visible" });
  const maybeLater = page.getByRole("button", { name: "Maybe later", exact: true });
  if (await maybeLater.isVisible().catch(() => false)) await maybeLater.click();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const captures = [];
  for (const viewport of [{ width: 1440, height: 900, suffix: "desktop" }, { width: 375, height: 812, suffix: "mobile" }]) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(() => localStorage.setItem("proWheelReminderDismissed", "1"));
    const page = await context.newPage();
    await signIn(page, process.env.E2E_USER_EMAIL, process.env.E2E_USER_PASSWORD);
    for (const route of routes) {
      const response = await page.goto(`${baseURL}/${route}`, { waitUntil: "networkidle" });
      const file = path.join(output, `aiwoven-${route}-${viewport.suffix}.png`);
      await page.screenshot({ path: file, fullPage: false });
      captures.push({ route, viewport: viewport.suffix, status: response?.status(), file });
    }
    await context.close();
  }

  const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ownerContext.addInitScript(() => localStorage.setItem("proWheelReminderDismissed", "1"));
  const ownerPage = await ownerContext.newPage();
  await signIn(ownerPage, process.env.E2E_OWNER_EMAIL, process.env.E2E_OWNER_PASSWORD);
  const ownerResponse = await ownerPage.goto(`${baseURL}/owner/analytics`, { waitUntil: "networkidle" });
  const ownerFile = path.join(output, "aiwoven-owner-analytics-desktop.png");
  await ownerPage.screenshot({ path: ownerFile, fullPage: false });
  captures.push({ route: "owner/analytics", viewport: "desktop", status: ownerResponse?.status(), file: ownerFile });
  await ownerContext.close();
  await browser.close();
  console.log(JSON.stringify(captures, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
