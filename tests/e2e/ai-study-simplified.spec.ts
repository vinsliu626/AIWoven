import { expect, test, type Page, type Route } from "@playwright/test";
import JSZip from "jszip";

type HistoryItem = {
  id: string;
  title: string;
  fileName: string;
  selectedModes: Array<"notes" | "flashcards" | "quiz">;
  selectedQuizTypes: string[];
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  errorSummary: string | null;
  itemCount: number;
  flashcardSetId: string | null;
  createdAt: string;
  updatedAt: string;
};

const fulfillJson = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const visibleTestId = (page: Page, testId: string) => page.locator(`[data-testid="${testId}"]:visible`);

async function makeDocx() {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/document.xml", `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Cells use mitochondria to convert nutrients into ATP. Chloroplasts capture light energy for photosynthesis. DNA stores genetic information.</w:t></w:r></w:p></w:body></w:document>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

async function installStudyApi(page: Page, options: { failGeneration?: boolean } = {}) {
  const history: HistoryItem[] = [];
  await page.route("**/api/auth/session", (route) => fulfillJson(route, { user: { id: "study-user", name: "Study User", email: "study@example.test", role: "USER" }, expires: "2099-01-01T00:00:00.000Z" }));
  await page.route("**/api/auth/providers", (route) => fulfillJson(route, {}));
  await page.route("**/api/chat/sessions", (route) => fulfillJson(route, { sessions: [] }));
  await page.route("**/api/analytics/visit", (route) => route.fulfill({ status: 204, body: "" }));
  await page.route("**/api/billing/wheel/status", (route) => fulfillJson(route, { canSpin: false }));
  await page.route("**/api/billing/status", (route) => fulfillJson(route, { ok: true, plan: "basic", unlimited: false, studyGenerationsPerDay: 1, studyMaxFileSizeBytes: 2_097_152, studyMaxExtractedChars: 8_000, studyMaxQuizQuestions: 10, studyMaxSelectableModes: 2, studyAllowedDifficulties: ["easy", "medium"], usedStudyCountToday: 0 }));
  await page.route("**/api/study/usage", (route) => fulfillJson(route, { ok: true, remainingToday: 1 }));
  await page.route("**/api/study/sessions", (route) => fulfillJson(route, { ok: true, sessions: history }));
  await page.route("**/api/study/generate", async (route) => {
    const payload = route.request().postDataJSON() as { title: string; fileName: string; selectedModes: string[]; quizTypes?: string[] };
    if (options.failGeneration) {
      const now = new Date().toISOString();
      history.unshift({ id: "failed-study-result", title: payload.title, fileName: payload.fileName, selectedModes: ["flashcards"], selectedQuizTypes: [], status: "FAILED", errorSummary: "Unable to generate study materials right now. Please try again.", itemCount: 0, flashcardSetId: null, createdAt: now, updatedAt: now });
      return fulfillJson(route, { ok: false, error: "STUDY_GENERATION_FAILED", message: "Unable to generate study materials right now. Please try again." }, 500);
    }
    expect(payload.selectedModes).toEqual(["flashcards"]);
    expect(payload.quizTypes).toBeUndefined();
    const now = new Date().toISOString();
    const session: HistoryItem = { id: "new-study-result", title: payload.title, fileName: payload.fileName, selectedModes: ["flashcards"], selectedQuizTypes: [], status: "COMPLETED", errorSummary: null, itemCount: 2, flashcardSetId: "synced-set", createdAt: now, updatedAt: now };
    history.unshift(session);
    return fulfillJson(route, { ok: true, flashcards: [{ front: "Cell powerhouse", back: "Mitochondrion" }, { front: "Photosynthesis organelle", back: "Chloroplast" }], meta: { selectedModes: ["flashcards"], generatedCounts: { flashcards: 2 }, truncated: false, originalCharCount: 120, usedCharCount: 120 }, session });
  });
  return history;
}

async function selectDocument(page: Page) {
  await visibleTestId(page, "study-upload-area").locator('input[type="file"]').setInputFiles({ name: "biology.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: await makeDocx() });
  await expect(visibleTestId(page, "study-selected-file")).toContainText("biology.docx");
  await expect(visibleTestId(page, "study-selected-file")).toContainText("Ready", { timeout: 15_000 });
}

test("AI Study uses the simplified single-output workflow and highlights a completed result three times", async ({ page }) => {
  await installStudyApi(page);
  await page.goto("/ai-study");
  const workspace = page.getByRole("heading", { name: "AI Study", exact: true }).locator("..").locator("..");
  await expect(visibleTestId(page, "study-upload-area")).toBeVisible();
  await expect(visibleTestId(page, "study-generate")).toBeDisabled();
  await expect(workspace.getByText("Quiz Types", { exact: true })).toHaveCount(0);
  await expect(workspace.getByText(/remaining daily generations|max chars|upload quota|payload character/i)).toHaveCount(0);
  await expect(visibleTestId(page, "study-history")).toContainText("No study material yet");

  await selectDocument(page);
  const output = visibleTestId(page, "study-output-type");
  await expect(output.locator("option:not([hidden])")).toHaveText(["Flashcards", "Quiz", "Notes"]);
  await expect(visibleTestId(page, "study-generate")).toBeDisabled();
  await output.selectOption("flashcards");
  await expect(visibleTestId(page, "study-generate")).toBeEnabled();
  await page.screenshot({ path: "output/ai-study-selected-file.png", fullPage: true });
  await visibleTestId(page, "study-generate").click();

  const item = visibleTestId(page, "study-history-item").filter({ hasText: "biology" });
  await expect(item).toHaveAttribute("data-status", "completed");
  await expect(item).toHaveAttribute("data-new", "true");
  expect(await item.evaluate((element) => getComputedStyle(element).animationIterationCount)).toBe("3");
  await expect(item.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/study/session/new-study-result");
  await page.screenshot({ path: "output/ai-study-history-completed.png", fullPage: true });
});

test("AI Study keeps the selected document after a controlled generation failure", async ({ page }) => {
  await installStudyApi(page, { failGeneration: true });
  await page.goto("/ai-study");
  await selectDocument(page);
  await visibleTestId(page, "study-output-type").selectOption("flashcards");
  await visibleTestId(page, "study-generate").click();
  await expect(page.getByText("Unable to generate study materials right now. Please try again.", { exact: true }).first()).toBeVisible();
  await expect(visibleTestId(page, "study-selected-file")).toContainText("biology.docx");
  await expect(visibleTestId(page, "study-history-item")).toHaveAttribute("data-status", "failed");
  await expect(visibleTestId(page, "study-history-item")).toContainText("Unable to generate study materials right now");
  await expect(page.getByText(/raw server|exception|stack/i)).toHaveCount(0);
});

test("completion highlighting respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installStudyApi(page);
  await page.goto("/ai-study");
  await selectDocument(page);
  await visibleTestId(page, "study-output-type").selectOption("flashcards");
  await visibleTestId(page, "study-generate").click();
  const item = visibleTestId(page, "study-history-item").filter({ hasText: "biology" });
  await expect(item).toHaveAttribute("data-status", "completed");
  expect(await item.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
});
