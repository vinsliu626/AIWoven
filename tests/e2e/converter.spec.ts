import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

const fixturesDir = path.join(process.cwd(), "tests", "fixtures", "converter");

function fixture(name: string) {
  return path.join(fixturesDir, name);
}

function converter(page: Page) {
  return page.getByTestId("converter-ui");
}

async function openConverter(page: Page, params = "e2e=1&plan=basic") {
  await page.goto(`/converter?${params}`);
  await expect(converter(page)).toBeVisible();
}

async function uploadSingleFile(page: Page, fileName: string) {
  await converter(page).getByTestId("converter-file-input").setInputFiles(fixture(fileName));
}

function converterAlert(page: Page) {
  return page.locator("p[role='alert']");
}

async function expectDownload(page: Page, trigger: () => Promise<void>, expectedExtension: string) {
  const [download] = await Promise.all([page.waitForEvent("download"), trigger()]);
  const suggested = download.suggestedFilename();
  expect(suggested.toLowerCase()).toContain(expectedExtension);
  const savedPath = await download.path();
  expect(savedPath).toBeTruthy();
}

test.describe("Converter", () => {
  test("renders the converter workspace smoke UI", async ({ page }) => {
    await openConverter(page);
    await expect(converter(page).getByRole("heading", { name: /convert files with a clear from to to flow/i })).toBeVisible();
    await expect(converter(page).getByLabel("From")).toBeVisible();
    await expect(converter(page).getByLabel("To")).toBeVisible();
    await expect(converter(page).getByTestId("converter-dropzone")).toBeVisible();
    await expect(converter(page).getByRole("button", { name: /convert file/i })).toBeVisible();
    await expect(page.getByText(/^Plan limit$/).first()).toBeVisible();
    await expect(page.getByText(/^Daily conversions$/).first()).toBeVisible();
  });

  test("updates valid TO options and supports swap on reversible image pairs", async ({ page }) => {
    await openConverter(page);
    const fromSelect = converter(page).getByLabel("From");
    const toSelect = converter(page).getByLabel("To");

    await fromSelect.selectOption("pdf");
    await expect(toSelect.locator("option[value='jpg']")).toBeEnabled();

    await fromSelect.selectOption("docx");
    await expect(toSelect.locator("option[value='pdf']")).toHaveAttribute("disabled", "");

    await fromSelect.selectOption("jpg");
    await toSelect.selectOption("png");
    await converter(page).getByRole("button", { name: /swap formats/i }).click();
    await expect(fromSelect).toHaveValue("png");
    await expect(toSelect).toHaveValue("jpg");
  });

  test("uploads a file and shows selected file details", async ({ page }) => {
    await openConverter(page);
    await converter(page).getByLabel("From").selectOption("jpg");
    await converter(page).getByLabel("To").selectOption("png");
    await uploadSingleFile(page, "sample.jpg");
    await expect(converter(page).getByText("sample.jpg")).toBeVisible();
    await expect(converter(page).getByRole("button", { name: /convert file/i })).toBeEnabled();
  });

  test("converts PDF to JPG successfully", async ({ page }) => {
    await openConverter(page);
    await converter(page).getByLabel("From").selectOption("pdf");
    await converter(page).getByLabel("To").selectOption("jpg");
    await uploadSingleFile(page, "sample.pdf");
    await converter(page).getByRole("button", { name: /convert file/i }).click();
    await expect(converter(page).getByTestId("converter-result")).toBeVisible();
    await expect(converter(page).getByText("sample.jpg")).toBeVisible();
    await expect(converter(page).getByText(/image\/jpeg/i)).toBeVisible();
    await expect(converterAlert(page)).toHaveCount(0);
    await expectDownload(page, () => converter(page).getByRole("link", { name: /download result/i }).click(), ".jpg");
  });

  test("converts JPG to PNG successfully", async ({ page }) => {
    await openConverter(page);
    await converter(page).getByLabel("From").selectOption("jpg");
    await converter(page).getByLabel("To").selectOption("png");
    await uploadSingleFile(page, "sample.jpg");
    await converter(page).getByRole("button", { name: /convert file/i }).click();
    await expect(converter(page).getByTestId("converter-result")).toBeVisible();
    await expect(converter(page).getByText("sample.png")).toBeVisible();
    await expect(converter(page).getByText(/image\/png/i)).toBeVisible();
    await expectDownload(page, () => converter(page).getByRole("link", { name: /download result/i }).click(), ".png");
  });

  test("converts PNG to WEBP successfully", async ({ page }) => {
    await openConverter(page);
    await converter(page).getByLabel("From").selectOption("png");
    await converter(page).getByLabel("To").selectOption("webp");
    await uploadSingleFile(page, "sample.png");
    await converter(page).getByRole("button", { name: /convert file/i }).click();
    await expect(converter(page).getByTestId("converter-result")).toBeVisible();
    await expect(converter(page).getByText("sample.webp")).toBeVisible();
    await expect(converter(page).getByText(/image\/webp/i)).toBeVisible();
  });

  test("converts JPG to PDF successfully", async ({ page }) => {
    await openConverter(page);
    await converter(page).getByLabel("From").selectOption("jpg");
    await converter(page).getByLabel("To").selectOption("pdf");
    await uploadSingleFile(page, "sample.jpg");
    await converter(page).getByRole("button", { name: /convert file/i }).click();
    await expect(converter(page).getByTestId("converter-result")).toBeVisible();
    await expect(converter(page).getByText("sample.pdf")).toBeVisible();
    await expect(converter(page).getByText(/application\/pdf/i)).toBeVisible();
    await expectDownload(page, () => converter(page).getByRole("link", { name: /download result/i }).click(), ".pdf");
  });

  test("rejects oversized files on Basic but allows the same file on Pro", async ({ page }) => {
    await openConverter(page, "e2e=1&plan=basic");
    await converter(page).getByLabel("From").selectOption("png");
    await converter(page).getByLabel("To").selectOption("webp");
    await uploadSingleFile(page, "oversized.png");
    await converter(page).getByRole("button", { name: /convert file/i }).click();
    await expect(converterAlert(page)).toContainText(/exceed your current converter file size limit/i);

    await openConverter(page, "e2e=1&plan=pro");
    await converter(page).getByLabel("From").selectOption("png");
    await converter(page).getByLabel("To").selectOption("webp");
    await uploadSingleFile(page, "oversized.png");
    await expect(converterAlert(page)).toHaveCount(0);
    await expect(converter(page).getByText(/50 MB/i).first()).toBeVisible();
  });

  test("shows quota messaging when the daily limit has been reached", async ({ page }) => {
    await openConverter(page, "e2e=1&plan=basic&usedToday=5");
    await converter(page).getByLabel("From").selectOption("jpg");
    await converter(page).getByLabel("To").selectOption("png");
    await uploadSingleFile(page, "sample.jpg");
    await converter(page).getByRole("button", { name: /convert file/i }).click();
    await expect(converterAlert(page)).toContainText(/used all converter runs for today/i);
  });

  test("handles unsupported files, invalid pairs, forced failures, and empty submission gracefully", async ({ page }) => {
    await openConverter(page);
    await converter(page).getByRole("button", { name: /convert file/i }).click();
    await expect(converterAlert(page)).toContainText(/upload a file before converting/i);

    await converter(page).getByLabel("From").selectOption("jpg");
    await converter(page).getByLabel("To").selectOption("png");
    await uploadSingleFile(page, "sample.txt");
    await converter(page).getByRole("button", { name: /convert file/i }).click();
    await expect(converterAlert(page)).toContainText(/does not match the selected from format/i);

    await openConverter(page, "e2e=1&plan=pro");
    await converter(page).getByLabel("From").selectOption("mp4");
    await expect(converter(page).getByLabel("To").locator("option[value='mp3']")).toHaveAttribute("disabled", "");
    await expect(converter(page).getByRole("button", { name: /convert file/i })).toBeDisabled();
    await expect(converter(page).getByText(/disabled on your current plan or not wired yet/i)).toBeVisible();

    await openConverter(page, "e2e=1&plan=basic&fail=conversion");
    await converter(page).getByLabel("From").selectOption("jpg");
    await converter(page).getByLabel("To").selectOption("png");
    await uploadSingleFile(page, "sample.jpg");
    await converter(page).getByRole("button", { name: /convert file/i }).click();
    await expect(converterAlert(page)).toContainText(/unable to complete this conversion/i);
  });
});
