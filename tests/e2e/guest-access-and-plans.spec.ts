import { expect, test } from "@playwright/test";

test.describe("guest access and plan comparison", () => {
  test("protected workspace modes ask guests to sign in instead of showing pricing", async ({ page }) => {
    await page.goto("/chat");

    await page.getByRole("button", { name: /Chat \/ Normal/ }).click();
    await page.getByRole("button", { name: "AI Study", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Sign in to use for free" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Sign in to use AI Study for free");
    await expect(dialog).toContainText("You do not need to choose a paid plan first.");
    await expect(page.getByText("Choose the plan that fits", { exact: true })).toHaveCount(0);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  for (const [path, tool] of [
    ["/ai-note", "AI Note"],
    ["/ai-detector", "AI Detector"],
    ["/ai-study", "AI Study"],
    ["/ai-humanizer", "AI Humanizer"],
    ["/converter", "Converter"],
  ] as const) {
    test(`${path} presents a free sign-in prompt to guests`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: `Sign in to use ${tool} for free` })).toBeVisible();
      await expect(page.getByText("You do not need to choose a paid plan first.")).toBeVisible();
      await expect(page.getByText("Choose the plan that fits", { exact: true })).toHaveCount(0);
    });
  }

  test("billing remains an explicit three-column feature comparison", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/chat");
    await page.getByRole("button", { name: "Billing", exact: true }).click();

    await expect(page.getByText("Choose the plan that fits", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Basic (Free)" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ultra Pro" })).toBeVisible();
    await expect(page.getByText("AI Detector", { exact: true })).toHaveCount(3);
    await expect(page.getByText("AI Notes", { exact: true })).toHaveCount(3);
    await expect(page.getByText("AI Study", { exact: true })).toHaveCount(3);
    await expect(page.getByText("Converter", { exact: true })).toHaveCount(3);
  });
});
