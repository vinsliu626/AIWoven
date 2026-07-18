import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Card = { id: string; frontText: string; backText: string; position: number; images: Array<{ id: string; side: "front" | "back"; fileName: string; mimeType: string; sizeBytes: number; url: string }> };
type SetRecord = { id: string; title: string; createdAt: string; updatedAt: string; cards: Card[] };

async function installApiFixture(page: Page) {
  let sequence = 0;
  const sets: SetRecord[] = [];
  const now = () => new Date().toISOString();
  const imageBytes = readFileSync(resolve("tests/fixtures/converter/sample.png"));
  const fulfillJson = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

  await page.route("**/api/auth/session", (route) => fulfillJson(route, { user: { id: "browser-user", name: "Browser User", email: "browser@example.com", role: "USER" }, expires: "2099-01-01T00:00:00.000Z" }));
  await page.route("**/api/billing/status", (route) => fulfillJson(route, { ok: true, plan: "basic", unlimited: false, isOwner: false }));
  await page.route("**/api/billing/wheel/status", (route) => fulfillJson(route, { ok: true, canSpin: false, nextSpinAt: null }));
  await page.route("**/api/chat/sessions", (route) => fulfillJson(route, { sessions: [{ id: "recent-chat", title: "Cell biology review", pinned: false }] }));
  await page.route("**/api/chat/session/recent-chat", (route) => fulfillJson(route, { ok: true, messages: [{ role: "user", content: "Review cell biology" }, { role: "assistant", content: "Let’s begin with organelles." }] }));
  await page.route("**/api/flashcards/images/*", (route) => route.fulfill({ status: 200, contentType: "image/png", body: imageBytes }));
  await page.route("**/api/flashcards/cards/*/image*", async (route) => {
    const cardId = route.request().url().split("/cards/")[1].split("/image")[0];
    const card = sets.flatMap((set) => set.cards).find((item) => item.id === cardId);
    if (!card) return fulfillJson(route, { error: "NOT_FOUND" }, 404);
    if (route.request().method() === "DELETE") {
      const side = new URL(route.request().url()).searchParams.get("side");
      card.images = card.images.filter((image) => image.side !== side);
      return fulfillJson(route, { ok: true });
    }
    const image = { id: `image-${++sequence}`, side: "front" as const, fileName: "sample.png", mimeType: "image/png", sizeBytes: imageBytes.length, url: `/api/flashcards/images/image-${sequence}` };
    card.images = [...card.images.filter((item) => item.side !== image.side), image];
    return fulfillJson(route, { image });
  });
  await page.route("**/api/flashcards/sets/**", async (route) => {
    const id = route.request().url().split("/sets/")[1].split(/[?#]/)[0];
    const set = sets.find((item) => item.id === id);
    if (!set) return fulfillJson(route, { error: "NOT_FOUND" }, 404);
    if (route.request().method() === "DELETE") {
      sets.splice(sets.indexOf(set), 1);
      return fulfillJson(route, { ok: true });
    }
    if (route.request().method() === "PATCH") {
      const payload = route.request().postDataJSON() as { title: string; cards: Array<{ id?: string; frontText: string; backText: string }> };
      set.title = payload.title;
      set.updatedAt = now();
      set.cards = payload.cards.map((card, position) => {
        const current = card.id ? set.cards.find((item) => item.id === card.id) : undefined;
        return { id: current?.id ?? `card-${++sequence}`, frontText: card.frontText, backText: card.backText, position, images: current?.images ?? [] };
      });
      return fulfillJson(route, { set });
    }
    return fulfillJson(route, { set });
  });
  await page.route("**/api/flashcards/sets", async (route) => {
    if (route.request().method() === "POST") {
      const payload = route.request().postDataJSON() as { title: string; cards: Array<{ frontText: string; backText: string }> };
      const set: SetRecord = { id: `set-${++sequence}`, title: payload.title, createdAt: now(), updatedAt: now(), cards: payload.cards.map((card, position) => ({ id: `card-${++sequence}`, ...card, position, images: [] })) };
      sets.push(set);
      return fulfillJson(route, { set }, 201);
    }
    return fulfillJson(route, { sets });
  });
  return sets;
}

test("manual flashcards support images, editing, studying, and refresh persistence", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  const sets = await installApiFixture(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/flashcards");
  await page.getByRole("button", { name: "Create set" }).click();
  await page.getByLabel("Set name").fill("Biology essentials");
  await page.getByLabel("Front").fill("Cell powerhouse");
  await page.getByLabel("Back").fill("Mitochondrion");
  await page.getByRole("button", { name: "Add card" }).click();
  await page.getByLabel("Front").nth(1).fill("Photosynthesis organelle");
  await page.getByLabel("Back").nth(1).fill("Chloroplast");
  await page.locator('input[type="file"]').first().setInputFiles(resolve("tests/fixtures/converter/sample.png"));
  await expect(page.getByAltText("front side illustration")).toBeVisible();
  await page.screenshot({ path: "output/flashcard-creation.png", fullPage: true });
  await page.getByRole("button", { name: "Save set" }).click();
  await expect.poll(() => sets.length).toBe(1);
  await expect(page.getByRole("status")).toContainText("Flashcard set saved");
  await page.getByRole("button", { name: "Back to library" }).click();
  await expect(page.getByText("Biology essentials")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Biology essentials")).toBeVisible();
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Back").first().fill("Mitochondria");
  await page.getByRole("button", { name: "Add card" }).click();
  await page.getByLabel("Front").nth(2).fill("Temporary card");
  await page.getByLabel("Back").nth(2).fill("Delete me");
  await page.getByRole("button", { name: "Delete card 3" }).click();
  await page.getByRole("button", { name: "Save set" }).click();
  await page.getByRole("button", { name: "Study this set" }).click();
  const card = page.getByTestId("manual-flashcard");
  const activeFace = card.locator(".manual-flashcard-face-front");
  const inner = page.getByTestId("manual-flashcard-inner");
  await expect(card.getByText("Front", { exact: true })).toHaveCount(0);
  await expect(card.getByText("Back", { exact: true })).toHaveCount(0);
  await expect(card.getByText("Tap to flip", { exact: true })).toHaveCount(0);
  await expect(card).toHaveAttribute("aria-label", "Show answer");
  await expect(card).toHaveAttribute("aria-pressed", "false");
  await expect(activeFace).toContainText("Cell powerhouse");
  await page.screenshot({ path: "output/flashcard-study-front.png", fullPage: true });

  await card.click();
  await expect(card).toHaveAttribute("data-animating", "true");
  await expect(inner).toHaveAttribute("style", /rotateX\(360deg\)/);
  await page.waitForTimeout(140);
  expect(await inner.evaluate((element) => getComputedStyle(element).transform)).toMatch(/^matrix3d\(/);
  await page.screenshot({ path: "output/flashcard-study-flip-in-progress.png", fullPage: true });
  await card.evaluate((element) => {
    for (let attempt = 0; attempt < 5; attempt += 1) (element as HTMLButtonElement).click();
  });
  await expect(card).toHaveAttribute("data-flip-turn", "1");
  await expect(card).toHaveAttribute("data-animating", "false");
  await expect(card).toHaveAttribute("aria-label", "Show question");
  await expect(card).toHaveAttribute("aria-pressed", "true");
  await expect(activeFace).toContainText("Mitochondria");
  await page.screenshot({ path: "output/flashcard-study-back.png", fullPage: true });

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("2 / 2")).toBeVisible();
  await expect(page.getByTestId("manual-flashcard")).toHaveAttribute("data-side", "front");
  await expect(page.getByTestId("manual-flashcard").locator(".manual-flashcard-face-front")).toContainText("Photosynthesis organelle");
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.getByTestId("manual-flashcard")).toHaveAttribute("data-side", "front");

  await page.getByTestId("manual-flashcard").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("manual-flashcard")).toHaveAttribute("data-side", "back");
  await expect(page.getByTestId("manual-flashcard")).toHaveAttribute("data-animating", "false");
  await page.keyboard.press("Space");
  await expect(page.getByTestId("manual-flashcard")).toHaveAttribute("data-side", "front");
  expect(consoleErrors).toEqual([]);
});

test("manual flashcard respects reduced motion while preserving side changes", async ({ page }) => {
  const sets = await installApiFixture(page);
  sets.push({ id: "reduced-set", title: "Reduced motion set", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), cards: [
    { id: "reduced-card", frontText: "Question side", backText: "Answer side", position: 0, images: [] },
  ] });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/flashcards");
  await page.getByRole("article").filter({ hasText: "Reduced motion set" }).getByRole("button", { name: "Study" }).click();
  const card = page.getByTestId("manual-flashcard");
  const inner = page.getByTestId("manual-flashcard-inner");
  await card.click();
  await expect(card).toHaveAttribute("data-side", "back");
  await expect(card.locator(".manual-flashcard-face-front")).toContainText("Answer side");
  expect(await inner.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
});

test("manual flashcard flips through touch interaction on mobile", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const sets = await installApiFixture(page);
  sets.push({ id: "touch-set", title: "Touch set", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), cards: [
    { id: "touch-card", frontText: "Mobile question", backText: "Mobile answer", position: 0, images: [] },
  ] });
  await page.goto("/flashcards");
  await page.getByRole("article").filter({ hasText: "Touch set" }).getByRole("button", { name: "Study" }).tap();
  const card = page.getByTestId("manual-flashcard");
  await card.tap();
  await expect(card).toHaveAttribute("data-side", "back");
  await expect(card).toHaveAttribute("data-animating", "false");
  await context.close();
});

test("Chat history expands, opens a conversation, and switches modes", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await installApiFixture(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/chat");
  const desktopNav = page.locator('[data-testid="desktop-workspace-nav"]:visible');
  await expect(desktopNav.locator('[data-testid="nav-chat-history"]:visible')).toBeVisible();
  await expect(desktopNav.getByRole("link", { name: "Cell biology review" })).toBeVisible();
  await page.screenshot({ path: "output/sidebar-expanded-chat-history.png" });
  await desktopNav.getByRole("link", { name: "Cell biology review" }).click();
  await expect(page.getByText("Let’s begin with organelles.")).toBeVisible();
  await page.getByRole("button", { name: /Chat \/ Normal/ }).click();
  await page.getByRole("button", { name: /Chat \/ Workflow/ }).click();
  await expect(page.getByRole("button", { name: /Chat \/ Workflow/ })).toBeVisible();
  const disclosure = desktopNav.getByRole("button", { name: "Collapse Chat history" });
  await disclosure.click();
  await expect(desktopNav.locator('[data-testid="nav-chat-history"]:visible')).toHaveCount(0);
  await desktopNav.getByRole("button", { name: "Expand Chat history" }).click();
  await expect(desktopNav.locator('[data-testid="nav-chat-history"]:visible')).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("Quiz Me completes matching, fill, and multiple-choice modes", async ({ page }) => {
  const sets = await installApiFixture(page);
  sets.push({ id: "quiz-set", title: "Biology essentials", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), cards: [
    { id: "c1", frontText: "Cell powerhouse", backText: "Mitochondrion", position: 0, images: [] },
    { id: "c2", frontText: "Photosynthesis organelle", backText: "Chloroplast", position: 1, images: [] },
  ] });
  await page.goto("/quiz-me");
  await expect(page.getByText("Matching", { exact: true })).toBeVisible();
  await page.screenshot({ path: "output/quiz-me-mode-selection.png", fullPage: true });

  await page.getByText("Matching", { exact: true }).click();
  await page.getByTestId("quiz-me-start").click();
  for (const [front, back] of [["Cell powerhouse", "Mitochondrion"], ["Photosynthesis organelle", "Chloroplast"]]) {
    await page.getByRole("button", { name: front, exact: true }).click();
    await page.getByRole("button", { name: back, exact: true }).click();
  }
  await expect(page.getByText("Session complete")).toBeVisible();
  await page.getByRole("button", { name: "Choose another mode" }).click();

  await page.getByText("Fill in the Blank", { exact: true }).click();
  await page.getByTestId("quiz-me-start").click();
  for (let question = 0; question < 2; question += 1) {
    const prompt = await page.locator("h2").textContent();
    await page.getByLabel("Your answer").fill(prompt?.includes("powerhouse") ? "  mitochondrion  " : "chloroplast");
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByRole("status")).toContainText("Correct");
    await page.getByRole("button", { name: question === 1 ? "View results" : "Next question" }).click();
  }
  await page.getByRole("button", { name: "Choose another mode" }).click();

  await page.getByText("Multiple Choice", { exact: true }).click();
  await page.getByTestId("quiz-me-start").click();
  for (let question = 0; question < 2; question += 1) {
    const prompt = await page.locator("h2").textContent();
    await page.getByRole("button", { name: prompt?.includes("powerhouse") ? "Mitochondrion" : "Chloroplast", exact: true }).click();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByRole("status")).toContainText("Correct");
    await page.getByRole("button", { name: question === 1 ? "View results" : "Next question" }).click();
  }
  await expect(page.getByText("2 correct")).toBeVisible();
  await expect(page.getByRole("button", { name: "Restart" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to study material" })).toBeVisible();
});

test("persistent navigation works on tablet and mobile", async ({ page }) => {
  await installApiFixture(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/flashcards");
  const nav = page.locator('[data-testid="desktop-workspace-nav"]:visible');
  await expect(nav).toBeVisible();
  await expect(page.getByRole("banner").getByText("AIWoven", { exact: true })).toHaveCount(0);
  expect(await nav.evaluate((element) => element.scrollWidth === element.clientWidth)).toBe(true);
  await expect(page.getByRole("link", { name: "Flashcards" })).toHaveAttribute("aria-current", "page");
  await page.getByTestId("workspace-nav-toggle").click();
  await expect(nav).toHaveAttribute("data-collapsed", "true");
  expect(await nav.evaluate((element) => element.scrollWidth === element.clientWidth)).toBe(true);
  await page.screenshot({ path: "output/sidebar-collapsed.png" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(nav).toBeHidden();
  await page.getByRole("button", { name: "Open workspace navigation" }).click();
  await expect(page.getByTestId("mobile-workspace-nav")).toBeVisible();
  expect(await page.getByTestId("mobile-workspace-nav").evaluate((element) => element.scrollWidth === element.clientWidth)).toBe(true);
  await page.getByTestId("mobile-workspace-nav").getByRole("link", { name: "Quiz Me" }).click();
  await expect(page).toHaveURL(/\/quiz-me$/);
  await expect(page.getByTestId("mobile-workspace-nav")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("every workspace navigation item opens its intended route", async ({ page }) => {
  test.setTimeout(120_000);
  await installApiFixture(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/chat");
  const destinations = [
    ["Note", "/ai-note"], ["Detect", "/ai-detector"], ["Study", "/ai-study"],
    ["Humanizer", "/ai-humanizer"], ["Converter", "/converter"], ["History", "/chat?history=1"],
    ["Flashcards", "/flashcards"], ["Quiz Me", "/quiz-me"], ["Chat", "/chat"],
  ] as const;
  for (const [label, destination] of destinations) {
    const nav = page.locator('[data-testid="desktop-workspace-nav"]:visible');
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${destination.replace(/[?]/g, "\\?")}$`), { timeout: 20_000 });
  }
});
