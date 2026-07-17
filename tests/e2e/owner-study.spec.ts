import { expect, test, type Page } from "@playwright/test";

const userEmail = process.env.E2E_USER_EMAIL ?? "";
const userPassword = process.env.E2E_USER_PASSWORD ?? "";
const ownerEmail = process.env.E2E_OWNER_EMAIL ?? "";
const ownerPassword = process.env.E2E_OWNER_PASSWORD ?? "";
const authConfigured = process.env.E2E_AUTH_ENABLED === "true" && Boolean(userEmail && userPassword && ownerEmail && ownerPassword);

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/api/auth/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in with (?:e2e test account|local test account)/i }).click();
  await expect(page).not.toHaveURL(/\/api\/auth\/signin/);
  await expect.poll(async () => (await page.request.get("/api/auth/session")).json()).toMatchObject({ user: { email } });
}

async function jsonFetch<T>(page: Page, url: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  return page.evaluate(async ({ fetchUrl, fetchInit }) => {
    const response = await fetch(fetchUrl, fetchInit);
    const text = await response.text();
    if (!response.headers.get("content-type")?.includes("application/json")) throw new Error(`${fetchUrl} returned ${response.status}: ${text.slice(0, 120)}`);
    return { status: response.status, body: JSON.parse(text) as T };
  }, { fetchUrl: url, fetchInit: init });
}

test.describe("Owner authorization and AI Study", () => {
  test.skip(!authConfigured, "Set the E2E auth variables and run npm run test:seed first.");

  test("normal user stays limited and cannot spoof Owner", async ({ page }) => {
    await signIn(page, userEmail, userPassword);
    await page.goto("/ai-study");
    await page.getByRole("button", { name: "Open account menu" }).click();
    await expect(page.getByRole("link", { name: "Owner Analytics" })).toHaveCount(0);

    const api = await jsonFetch<{ ok: boolean }>(page, "/api/owner/analytics");
    expect(api.status).toBe(403);
    await page.goto("/owner/analytics");
    await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "AIWoven Analytics", exact: true })).toHaveCount(0);

    const before = await jsonFetch<{ unlimited: boolean; usedStudyCountToday: number; usedConverterCountToday: number }>(page, "/api/billing/status");
    expect(before.body.unlimited).toBe(false);
    expect(before.body.usedStudyCountToday).toBeGreaterThanOrEqual(1);
    const spoof = await jsonFetch<{ ok: boolean }>(page, "/api/converter/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ from: "PNG", to: "JPG", fileSizeBytes: 128, role: "OWNER" }),
    });
    expect(spoof.status).toBe(200);
    const after = await jsonFetch<{ unlimited: boolean; isOwner: boolean; usedConverterCountToday: number }>(page, "/api/billing/status");
    expect(after.body.unlimited).toBe(false);
    expect(after.body.isOwner).toBe(false);
    expect(after.body.usedConverterCountToday).toBe(before.body.usedConverterCountToday + 1);

    await page.goto("/api/auth/signout");
    await page.getByRole("button", { name: /^sign out$/i }).click();
  });

  test("Owner sees Analytics, remains unlimited, and keeps role after refresh", async ({ page }) => {
    await signIn(page, ownerEmail, ownerPassword);
    await page.goto("/ai-study");
    await page.getByRole("button", { name: "Open account menu" }).click();
    const analyticsLink = page.getByRole("link", { name: "Owner Analytics", exact: true });
    await expect(analyticsLink).toBeVisible();
    await analyticsLink.click();
    await expect(page).toHaveURL(/\/owner\/analytics$/);
    await expect(page.getByRole("heading", { name: "AIWoven Analytics" })).toBeVisible();
    await expect(page.getByText("Total visits")).toBeVisible();
    await expect(page.getByText("Feature usage")).toBeVisible();

    const before = await jsonFetch<{ unlimited: boolean; isOwner: boolean; usedConverterCountToday: number }>(page, "/api/billing/status");
    expect(before.body.unlimited).toBe(true);
    expect(before.body.isOwner).toBe(true);
    const usage = await jsonFetch<{ ok: boolean }>(page, "/api/converter/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ from: "PNG", to: "JPG", fileSizeBytes: 128 }),
    });
    expect(usage.status).toBe(200);
    const after = await jsonFetch<{ unlimited: boolean; usedConverterCountToday: number }>(page, "/api/billing/status");
    expect(after.body.unlimited).toBe(true);
    expect(after.body.usedConverterCountToday).toBe(before.body.usedConverterCountToday);

    await page.reload();
    await expect(page.getByRole("heading", { name: "AIWoven Analytics" })).toBeVisible();
  });

  test("Owner completes flashcard and independent quiz flows on desktop and mobile", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signIn(page, ownerEmail, ownerPassword);
    await page.goto("/ai-study");
    await page.getByRole("button", { name: /e2e photosynthesis study set/i }).click();
    await page.getByTestId("study-tab-flashcards").click();

    const card = page.getByTestId("flashcard");
    await expect(card).toBeVisible();
    await card.click();
    await expect(card).toHaveAttribute("aria-label", "Show flashcard front");
    await page.waitForTimeout(550);
    await page.getByTestId("flashcard-flip").click();
    await expect(card).toHaveAttribute("aria-label", "Show flashcard answer");
    await page.waitForTimeout(550);
    await page.keyboard.press("Space");
    await expect(card).toHaveAttribute("aria-label", "Show flashcard front");
    await page.waitForTimeout(550);
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("flashcard-progress")).toHaveText("2 / 3");
    await expect(card).toHaveAttribute("aria-label", "Show flashcard answer");
    await page.getByTestId("flashcard-next").click();
    await expect(page.getByTestId("flashcard-progress")).toHaveText("3 / 3");
    await page.getByTestId("flashcard-previous").click();
    await page.getByTestId("flashcard-shuffle").click();
    await expect(page.getByTestId("flashcard-progress")).toHaveText("1 / 3");
    await page.getByTestId("flashcard-restart").click();
    await card.click();
    await card.click();
    await page.waitForTimeout(600);
    await expect(card).toHaveAttribute("aria-label", "Show flashcard front");

    await page.getByTestId("study-tab-quiz").click();
    await page.getByTestId("start-quiz").click();
    await expect(page).toHaveURL(/\/study\/quiz\/e2e-owner-study-session$/);
    await expect(page.getByRole("heading", { name: /which organelle performs photosynthesis/i })).toBeVisible();
    await page.getByRole("button", { name: /mitochondrion/i }).click();
    await page.getByRole("button", { name: /check answer/i }).click();
    await expect(page.getByRole("status")).toContainText("Incorrect");
    await expect(page.getByRole("status")).toContainText("Your answer: Mitochondrion");
    await expect(page.getByRole("status")).toContainText("Correct answer: Chloroplast");
    await expect(page.getByRole("status")).toContainText(/chloroplasts contain thylakoids/i);
    await page.getByRole("button", { name: /next question/i }).click();
    await page.getByRole("button", { name: /nadph/i }).click();
    await page.getByRole("button", { name: /check answer/i }).click();
    await expect(page.getByRole("status")).toContainText("Correct");
    await expect(page.getByRole("status")).toContainText(/high-energy electrons/i);
    await page.getByRole("button", { name: /finish quiz/i }).click();
    await expect(page.getByText("50%")).toBeVisible();
    await expect(page.getByText(/1 correct · 1 incorrect · 2 total/i)).toBeVisible();
    await expect(page.getByText(/your answer:/i).last()).toBeVisible();
    await page.getByRole("button", { name: /retry quiz/i }).click();
    await expect(page.getByText(/^Question 1 of \d+$/)).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(page.getByRole("link", { name: /exit quiz/i })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("configured real provider generates schema-valid flashcards and quiz explanations", async ({ page }) => {
    test.skip(process.env.E2E_REAL_AI !== "true", "Set E2E_REAL_AI=true when a configured provider key is available.");
    await signIn(page, ownerEmail, ownerPassword);
    const generated = await jsonFetch<{
      ok: boolean;
      flashcards: Array<{ front: string; back: string }>;
      quiz: Array<{ type: string; question?: string; options?: string[]; answer?: string; explanation: string }>;
      meta: { provider: string; model: string };
      session: { id: string };
    }>(page, "/api/study/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Real Provider Photosynthesis E2E",
        fileName: "photosynthesis-real-e2e.pdf",
        fileSizeBytes: 4096,
        mimeType: "application/pdf",
        selectedModes: ["flashcards", "quiz"],
        quizTypes: ["multiple_choice"],
        quizCount: 2,
        difficulty: "medium",
        extractedText: "Photosynthesis converts light energy into chemical energy. Light-dependent reactions occur in thylakoid membranes and produce ATP, NADPH, and oxygen. The Calvin cycle occurs in the chloroplast stroma, using ATP and NADPH to fix carbon dioxide into carbohydrate precursors. Chlorophyll absorbs light, while water supplies electrons and releases oxygen as a byproduct.",
      }),
    });
    expect(generated.status).toBe(200);
    expect(generated.body.ok).toBe(true);
    expect(generated.body.meta.provider).toBe("groq");
    expect(generated.body.flashcards.length).toBeGreaterThan(0);
    expect(generated.body.quiz.length).toBeGreaterThan(0);
    for (const item of generated.body.quiz) {
      expect(item.explanation.trim().length).toBeGreaterThan(0);
      if (item.type === "multiple_choice") {
        expect(item.options).toContain(item.answer);
        expect(new Set(item.options).size).toBe(item.options?.length);
      }
    }
    await page.goto(`/study/quiz/${generated.body.session.id}`);
    await expect(page.getByText(/^Question 1 of \d+$/)).toBeVisible();
  });
});
