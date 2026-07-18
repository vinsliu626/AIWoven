import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const userEmail = process.env.E2E_USER_EMAIL ?? "";
const userPassword = process.env.E2E_USER_PASSWORD ?? "";
const authConfigured = process.env.E2E_AUTH_ENABLED === "true" && Boolean(userEmail && userPassword);

async function signIn(page: Page) {
  await page.goto("/api/auth/signin");
  await page.getByLabel("Email").fill(userEmail);
  await page.getByLabel("Password").fill(userPassword);
  await page.getByRole("button", { name: /sign in with (?:e2e test account|local test account)/i }).click();
  await expect(page).not.toHaveURL(/\/api\/auth\/signin/);
  await expect.poll(async () => (await page.request.get("/api/auth/session")).json()).toMatchObject({ user: { email: userEmail } });
}

async function removeAcceptanceSets(page: Page) {
  const response = await page.request.get("/api/flashcards/sets");
  expect(response.ok()).toBe(true);
  const body = await response.json() as {
    sets: Array<{ id: string; title: string; cards: Array<{ frontText: string }> }>;
  };
  const acceptanceSets = body.sets.filter((set) =>
    set.title === "w" && set.cards.some((card) => card.frontText === "acceptance front")
  );
  await Promise.all(acceptanceSets.map(async (set) => {
    const deleted = await page.request.delete(`/api/flashcards/sets/${set.id}`);
    expect(deleted.ok()).toBe(true);
  }));
}

async function dismissRewardPrompt(page: Page) {
  const dismiss = page.getByRole("button", { name: "Maybe later" });
  const appeared = await dismiss.waitFor({ state: "visible", timeout: 4_000 }).then(() => true).catch(() => false);
  if (appeared) await dismiss.click();
}

test("an authenticated user can create, persist, study, and delete a flashcard set", async ({ page }) => {
  test.skip(!authConfigured, "Local E2E credentials are not configured.");
  test.setTimeout(90_000);

  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await signIn(page);
  await removeAcceptanceSets(page);
  await page.goto("/flashcards");
  await dismissRewardPrompt(page);
  await page.getByRole("button", { name: "Create set" }).click();
  await page.getByLabel("Set name").fill("w");
  await page.getByLabel("Front").fill("acceptance front");
  await page.getByLabel("Back").fill("acceptance back");
  await page.locator('input[type="file"]').first().setInputFiles(path.resolve("tests/fixtures/converter/sample.png"));
  await page.getByRole("button", { name: "Save set" }).click();

  await expect(page.getByRole("status")).toContainText("Flashcard set saved.", { timeout: 20_000 });
  await expect(page.getByLabel("Set name")).toHaveValue("w");
  await expect(page.getByAltText("front side illustration")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "w", exact: true })).toBeVisible();
  await dismissRewardPrompt(page);
  const setRow = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "w", exact: true }) });
  await setRow.getByRole("button", { name: "Study" }).click();
  const card = page.getByTestId("manual-flashcard");
  await expect(card.locator(".manual-flashcard-face-front")).toContainText("acceptance front");
  await expect(card.getByAltText("front side illustration")).toBeVisible();
  await card.click();
  await expect(card).toHaveAttribute("data-side", "back");
  await expect(card.locator(".manual-flashcard-face-front")).toContainText("acceptance back");

  await dismissRewardPrompt(page);
  await page.getByRole("button", { name: "Back to library" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await setRow.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: "w", exact: true })).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});
