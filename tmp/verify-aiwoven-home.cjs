const { chromium } = require("@playwright/test");
const path = require("node:path");

const baseURL = "http://127.0.0.1:3000";
const output = path.resolve(__dirname, "..", "output");
const widths = [320, 375, 430, 768, 1024, 1440, 1920];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: width < 600 ? 812 : 900 } });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("requestfailed", request => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));

    const response = await page.goto(baseURL, { waitUntil: "networkidle" });
    const metrics = await page.evaluate(() => ({
      title: document.title,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyText: document.body.innerText,
    }));
    const ctaHref = await page.getByRole("link", { name: "Try for free" }).first().getAttribute("href");
    results.push({
      width,
      status: response?.status(),
      title: metrics.title,
      overflow: metrics.scrollWidth - metrics.clientWidth,
      ctaHref,
      hasOldBrand: /nexus\s*desk/i.test(metrics.bodyText),
      hasDemo: /\bdemo\b/i.test(metrics.bodyText),
      consoleErrors,
      pageErrors,
      failedRequests,
    });

    if (width === 375 || width === 1440) {
      await page.screenshot({ path: path.join(output, `aiwoven-home-${width}.png`), fullPage: true });
      await page.locator("section").first().screenshot({ path: path.join(output, `aiwoven-hero-${width}.png`) });
    }
    if (width === 1440) {
      await page.locator("#workflow").screenshot({ path: path.join(output, "aiwoven-workflow-1440.png") });
      await page.getByText("AI Study showcase", { exact: true }).locator("xpath=ancestor::section").screenshot({ path: path.join(output, "aiwoven-study-1440.png") });
    }
    await context.close();
  }

  const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(baseURL, { waitUntil: "networkidle" });
  const reducedMotion = await reducedPage.evaluate(() => ({
    aurora: getComputedStyle(document.querySelector(".aiwoven-aurora")).animationName,
    particles: [...document.querySelectorAll(".aiwoven-particle")].map(node => getComputedStyle(node).animationName),
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
  }));
  await reducedContext.close();

  const apiContext = await browser.newContext();
  const apiResponse = await apiContext.request.get(`${baseURL}/api/analytics/public-stats`);
  const apiText = await apiResponse.text();
  const apiJson = JSON.parse(apiText);
  const api = {
    status: apiResponse.status(),
    keys: Object.keys(apiJson).sort(),
    hasSensitiveField: /email|userId|ip|path|timestamp|event/i.test(apiText),
    values: apiJson,
  };
  await apiContext.close();

  const routeContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const routePage = await routeContext.newPage();
  const routeErrors = [];
  routePage.on("pageerror", error => routeErrors.push(error.message));
  const chatResponse = await routePage.goto(`${baseURL}/chat`, { waitUntil: "networkidle" });
  const chat = {
    status: chatResponse?.status(),
    url: routePage.url(),
    title: await routePage.title(),
    hasAIWoven: /AIWoven/i.test(await routePage.locator("body").innerText()),
    errors: routeErrors,
  };
  await routeContext.close();

  await browser.close();
  console.log(JSON.stringify({ results, reducedMotion, api, chat }, null, 2));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
