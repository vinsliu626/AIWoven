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

function dropdownButton(page: Page, label: "From" | "To") {
  return converter(page).getByRole("button", { name: label, exact: true });
}

async function openDropdown(page: Page, label: "From" | "To") {
  await dropdownButton(page, label).click();
  const listbox = page.getByRole("listbox", { name: label, exact: true });
  await expect(listbox).toBeVisible();
  return listbox;
}

async function chooseOption(page: Page, label: "From" | "To", option: string) {
  const listbox = await openDropdown(page, label);
  await listbox.getByRole("option", { name: new RegExp(`^${option}(\\s|$)`, "i") }).click();
}

async function expectOptionDisabled(page: Page, label: "From" | "To", option: string) {
  const listbox = await openDropdown(page, label);
  await expect(listbox.getByRole("option", { name: new RegExp(`^${option}(\\s|$)`, "i") })).toBeDisabled();
  await page.keyboard.press("Escape");
}

test.describe("Converter", () => {
  test("renders the converter workspace smoke UI", async ({ page }) => {
    await openConverter(page);
    await expect(converter(page).getByRole("heading", { name: /convert files with a clear from to to flow/i })).toBeVisible();
    await expect(dropdownButton(page, "From")).toBeVisible();
    await expect(dropdownButton(page, "To")).toBeVisible();
    await expect(converter(page).getByTestId("converter-dropzone")).toBeVisible();
    await expect(converter(page).getByRole("button", { name: /convert file/i })).toBeVisible();
    await expect(page.getByText(/^Plan limit$/).first()).toBeVisible();
    await expect(page.getByText(/^Daily conversions$/).first()).toBeVisible();
  });

  test("only allows live source and target options and supports swap on reversible image pairs", async ({ page }) => {
    await openConverter(page);

    await expectOptionDisabled(page, "From", "DOCX");
    await expectOptionDisabled(page, "From", "MP4");

    await chooseOption(page, "From", "PDF");
    const toListbox = await openDropdown(page, "To");
    await expect(toListbox.getByRole("option", { name: /^JPG(\s|$)/i })).toBeVisible();
    await expect(toListbox.getByRole("option", { name: /^PNG(\s|$)/i })).toBeVisible();
    await expect(toListbox.getByRole("option", { name: /^WEBP(\s|$)/i })).toBeVisible();
    await expect(toListbox.getByRole("option", { name: /^DOCX(\s|$)/i })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(converter(page).getByText("PDF → JPG")).toBeVisible();

    await chooseOption(page, "From", "JPG");
    await chooseOption(page, "To", "PNG");
    await converter(page).getByRole("button", { name: /swap formats/i }).click();
    await expect(converter(page).getByText("PNG → JPG")).toBeVisible();
  });

  test("uploads a file and shows selected file details", async ({ page }) => {
    await openConverter(page);
    await chooseOption(page, "From", "JPG");
    await chooseOption(page, "To", "PNG");
    await uploadSingleFile(page, "sample.jpg");
    await expect(converter(page).getByText("sample.jpg")).toBeVisible();
    await expect(converter(page).getByRole("button", { name: /convert file/i })).toBeEnabled();
  });

  test("converts PDF to JPG successfully", async ({ page }) => {
    await openConverter(page);
    await chooseOption(page, "From", "PDF");
    await chooseOption(page, "To", "JPG");
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
    await chooseOption(page, "From", "JPG");
    await chooseOption(page, "To", "PNG");
    await uploadSingleFile(page, "sample.jpg");
    await converter(page).getByRole("button", { name: /convert file/i }).click();
    await expect(converter(page).getByTestId("converter-result")).toBeVisible();
    await expect(converter(page).getByText("sample.png")).toBeVisible();
    await expect(converter(page).getByText(/image\/png/i)).toBeVisible();
    await expectDownload(page, () => converter(page).getByRole("link", { name: /download result/i }).click(), ".png");
  });

  test("converts PNG to JPG successfully", async ({ page }) => {
    await openConverter(page);
    await chooseOption(page, "From", "PNG");
    await chooseOption(page, "To", "JPG");
    await uploadSingleFile(page, "sample.png");
    await converter(page).getByRole("button", { name: /convert file/i }).click();
    await expect(converter(page).getByTestId("converter-result")).toBeVisible();
    await expect(converter(page).getByText("sample.jpg")).toBeVisible();
    await expect(converter(page).getByText(/image\/jpeg/i)).toBeVisible();
  });

  test("converts PNG to WEBP successfully", async ({ page }) => {
    await openConverter(page);
    await chooseOption(page, "From", "PNG");
    await chooseOption(page, "To", "WEBP");
    await uploadSingleFile(page, "sample.png");
    await converter(page).getByRole("button", { name: /convert file/i }).click();
    await expect(converter(page).getByTestId("converter-result")).toBeVisible();
    await expect(converter(page).getByText("sample.webp")).toBeVisible();
    await expect(converter(page).getByText(/image\/webp/i)).toBeVisible();
  });

  test("converts WEBP to PNG successfully", async ({ page }) => {
    await openConverter(page);
    await chooseOption(page, "From", "WEBP");
    await chooseOption(page, "To", "PNG");
    await uploadSingleFile(page, "sample.webp");
    await converter(page).getByRole("button", { name: /convert file/i }).click();
    await expect(converter(page).getByTestId("converter-result")).toBeVisible();
    await expect(converter(page).getByText("sample.png")).toBeVisible();
    await expect(converter(page).getByText(/image\/png/i)).toBeVisible();
  });

  test("rejects oversized files on Basic but allows the same file on Pro", async ({ page }) => {
    await openConverter(page, "e2e=1&plan=basic");
    await chooseOption(page, "From", "PNG");
    await chooseOption(page, "To", "WEBP");
    await uploadSingleFile(page, "oversized.png");
    await converter(page).getByRole("button", { name: /convert file/i }).click();
    await expect(converterAlert(page)).toContainText(/exceed your current converter file size limit/i);

    await openConverter(page, "e2e=1&plan=pro");
    await chooseOption(page, "From", "PNG");
    await chooseOption(page, "To", "WEBP");
    await uploadSingleFile(page, "oversized.png");
    await expect(converterAlert(page)).toHaveCount(0);
    await expect(converter(page).getByText(/50 MB/i).first()).toBeVisible();
  });

  test("shows quota messaging when the daily limit has been reached", async ({ page }) => {
    await openConverter(page, "e2e=1&plan=basic&usedToday=5");
    await chooseOption(page, "From", "JPG");
    await chooseOption(page, "To", "PNG");
    await uploadSingleFile(page, "sample.jpg");
    await converter(page).getByRole("button", { name: /convert file/i }).click();
    await expect(converterAlert(page)).toContainText(/used all converter runs for today/i);
  });

  test("handles unsupported files, invalid pairs, forced failures, and empty submission gracefully", async ({ page }) => {
    await openConverter(page);
    await converter(page).getByRole("button", { name: /convert file/i }).click();
    await expect(converterAlert(page)).toContainText(/upload a file before converting/i);

    await chooseOption(page, "From", "JPG");
    await chooseOption(page, "To", "PNG");
    await uploadSingleFile(page, "sample.txt");
    await converter(page).getByRole("button", { name: /convert file/i }).click();
    await expect(converterAlert(page)).toContainText(/does not match the selected from format/i);

    await openConverter(page, "e2e=1&plan=pro");
    await expectOptionDisabled(page, "From", "MP4");
    await expect(converter(page).getByText("PDF → JPG")).toBeVisible();

    await openConverter(page, "e2e=1&plan=basic&fail=conversion");
    await chooseOption(page, "From", "JPG");
    await chooseOption(page, "To", "PNG");
    await uploadSingleFile(page, "sample.jpg");
    await converter(page).getByRole("button", { name: /convert file/i }).click();
    await expect(converterAlert(page)).toContainText(/unable to complete this conversion/i);
  });
});
