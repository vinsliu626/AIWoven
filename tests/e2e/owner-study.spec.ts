import { expect, test, type Page } from "@playwright/test";
import JSZip from "jszip";

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

async function makeStudyDocx(text: string) {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/document.xml", `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`);
  return zip.generateAsync({ type: "nodebuffer" });
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
    const privateStudy = await jsonFetch<{ ok: boolean }>(page, "/api/study/session/e2e-owner-study-session");
    expect(privateStudy.status).toBe(404);
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
    const analyticsLink = page.getByRole("link", { name: "Owner Analytics", exact: true }).last();
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

  test("Owner opens one persisted dataset across focused Learn, Quiz, Matching, Flashcards, and Quiz Me", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signIn(page, ownerEmail, ownerPassword);
    await page.goto("/ai-study");
    await expect(page.getByRole("button", { name: "Open account menu" })).toBeVisible();
    await page.screenshot({ path: "output/ai-study-before-upload.png", fullPage: true });
    const historyItem = page.getByTestId("study-history-item").filter({ hasText: "E2E Photosynthesis Study Set" });
    await expect(historyItem).toHaveAttribute("data-status", "completed");
    await historyItem.getByRole("link", { name: "Open" }).click();
    await expect(page).toHaveURL(/\/study\/session\/e2e-owner-study-session$/);
    await expect(page.getByTestId("focused-study-progress")).toHaveText("1 / 3");
    await page.screenshot({ path: "output/ai-study-focused-learn.png", fullPage: true });

    const card = page.getByTestId("focused-study-card");
    await expect(card).toBeVisible();
    await card.click();
    await expect(card).toHaveAttribute("aria-label", "Show question");
    await expect(card).toHaveAttribute("data-flip-turn", "1");
    await expect(card).toHaveAttribute("data-side", "back");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("focused-study-progress")).toHaveText("2 / 3");

    await page.getByTestId("study-mode-selector").click();
    await page.screenshot({ path: "output/ai-study-mode-menu.png", fullPage: true });
    await page.getByRole("menuitem", { name: "Quiz" }).click();
    await page.screenshot({ path: "output/ai-study-focused-quiz.png", fullPage: true });
    const question = page.locator("main section section").last();
    await question.locator("button").filter({ hasNotText: /check answer/i }).first().click();
    await page.getByRole("button", { name: /check answer/i }).click();
    await expect(page.getByRole("status")).toBeVisible();

    await page.getByTestId("study-mode-selector").click();
    await page.getByRole("menuitem", { name: "Matching" }).click();
    await page.screenshot({ path: "output/ai-study-focused-matching.png", fullPage: true });
    await page.getByRole("button", { name: "What is photosynthesis?" }).click();
    await page.getByRole("button", { name: /A process that converts light energy/i }).click();
    await expect(page.getByRole("status")).toHaveText("Correct match");

    await page.goto("/flashcards");
    const persistedSet = page.locator("article").filter({ hasText: "E2E Photosynthesis Study Set" });
    await expect(persistedSet).toContainText("3 cards");
    await persistedSet.getByRole("button", { name: "Study" }).click();
    await expect(page.getByTestId("manual-flashcard")).toBeVisible();

    await page.goto("/quiz-me");
    await expect(page.getByLabel("Study material")).toContainText("E2E Photosynthesis Study Set (3 cards)");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(page.getByRole("heading", { name: "Quiz Me" })).toBeVisible();
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
      session: { id: string; status: string; flashcardSetId: string };
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
    expect(generated.body.session.status).toBe("COMPLETED");
    expect(generated.body.session.flashcardSetId).toBeTruthy();
    for (const item of generated.body.quiz) {
      expect(item.explanation.trim().length).toBeGreaterThan(0);
      if (item.type === "multiple_choice") {
        expect(item.options).toContain(item.answer);
        expect(new Set(item.options).size).toBe(item.options?.length);
      }
    }
    const persisted = await jsonFetch<{ ok: boolean; session: { status: string; flashcardSetId: string } }>(page, `/api/study/session/${generated.body.session.id}`);
    expect(persisted.status).toBe(200);
    expect(persisted.body.session).toMatchObject({ status: "COMPLETED", flashcardSetId: generated.body.session.flashcardSetId });
    const flashcardSets = await jsonFetch<{ sets: Array<{ id: string; title: string }> }>(page, "/api/flashcards/sets");
    expect(flashcardSets.body.sets.filter((set) => set.id === generated.body.session.flashcardSetId)).toHaveLength(1);

    await page.goto(`/study/session/${generated.body.session.id}`);
    await expect(page.getByTestId("focused-study-card")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("focused-study-card")).toBeVisible();
    await page.goto("/quiz-me");
    await expect(page.getByLabel("Study material")).toContainText("Real Provider Photosynthesis E2E");
  });

  test("real browser extraction persists Flashcards and Notes through authenticated APIs", async ({ page }) => {
    test.skip(process.env.E2E_REAL_AI !== "true", "Set E2E_REAL_AI=true when a configured provider key is available.");
    test.setTimeout(120_000);
    const suffix = Date.now().toString(36);
    const flashcardsTitle = `Real Browser Biology ${suffix}`;
    const notesTitle = `Real Browser History ${suffix}`;
    await signIn(page, ownerEmail, ownerPassword);
    await page.goto("/ai-study");

    const upload = async (name: string, text: string) => {
      await page.locator('[data-testid="study-upload-area"]:visible input[type="file"]').setInputFiles({ name, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: await makeStudyDocx(text) });
      await expect(page.locator('[data-testid="study-selected-file"]:visible')).toContainText("Ready", { timeout: 20_000 });
    };

    await upload("cell-biology-real.docx", "Cellular respiration converts glucose into usable ATP. Glycolysis occurs in the cytoplasm. The citric acid cycle and oxidative phosphorylation occur in mitochondria. The electron transport chain creates a proton gradient that powers ATP synthase. Oxygen is the final electron acceptor and water is produced.");
    await page.locator('[data-testid="study-output-type"]:visible').selectOption("flashcards");
    await page.getByLabel("Title (optional)").fill(flashcardsTitle);
    await page.locator('[data-testid="study-generate"]:visible').click();
    const flashcardsItem = page.locator('[data-testid="study-history-item"]:visible').filter({ hasText: flashcardsTitle });
    await expect(flashcardsItem).toHaveAttribute("data-status", "completed", { timeout: 60_000 });
    await expect(flashcardsItem).toHaveAttribute("data-new", "true");
    await flashcardsItem.getByRole("link", { name: "Open" }).click();
    await expect(page.getByTestId("focused-study-card")).toBeVisible();

    await page.goto("/flashcards");
    await expect(page.locator("article").filter({ hasText: flashcardsTitle })).toBeVisible();
    await page.goto("/quiz-me");
    await expect(page.getByLabel("Study material")).toContainText(flashcardsTitle);

    await page.goto("/ai-study");
    await upload("industrial-revolution-real.docx", "The Industrial Revolution accelerated mechanized manufacturing during the eighteenth and nineteenth centuries. Steam power expanded factory production and transportation. Urbanization increased as workers moved toward industrial centers. Railways connected markets, while labor reforms gradually addressed dangerous working conditions and long hours.");
    await page.locator('[data-testid="study-output-type"]:visible').selectOption("notes");
    await page.getByLabel("Title (optional)").fill(notesTitle);
    await page.locator('[data-testid="study-generate"]:visible').click();
    const notesItem = page.locator('[data-testid="study-history-item"]:visible').filter({ hasText: notesTitle });
    await expect(notesItem).toHaveAttribute("data-status", "completed", { timeout: 60_000 });
    await page.reload();
    await expect(page.locator('[data-testid="study-history-item"]:visible').filter({ hasText: flashcardsTitle })).toHaveAttribute("data-status", "completed");
    await expect(page.locator('[data-testid="study-history-item"]:visible').filter({ hasText: notesTitle })).toHaveAttribute("data-status", "completed");
    await notesItem.getByRole("link", { name: "Open" }).click();
    await expect(page.getByTestId("study-mode-selector")).toHaveText(/Learn/);
    await expect(page.getByTestId("focused-study-card")).toHaveCount(0);
  });
});
