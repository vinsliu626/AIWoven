import path from "node:path";
import { expect, test } from "@playwright/test";

const localAuthConfigured = process.env.E2E_AUTH_ENABLED === "true"
  && Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

test("hero keeps the primary CTA and multi-agent product stage in the first desktop viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  await page.waitForTimeout(900);

  const cta = page.locator('[data-testid="hero-primary-cta"]:visible');
  const productStage = page.locator('[data-testid="hero-product-stage"]:visible');
  await expect(cta).toBeVisible();
  await expect(productStage).toBeVisible();
  await expect(productStage).toContainText("Planner");
  await expect(productStage).toContainText("Reviewer");
  await expect(productStage).toContainText("Final output");
  await expect(productStage).toContainText("Record → AI Notes");
  await expect(productStage).toContainText("AI Detect");
  await expect(productStage).toContainText("Explained quiz");

  const ctaBox = await cta.boundingBox();
  expect(ctaBox).not.toBeNull();
  expect((ctaBox?.y ?? 0) + (ctaBox?.height ?? 0)).toBeLessThanOrEqual(768);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await page.screenshot({ path: path.resolve("output/aiwoven-hero-workflow-1366.png"), fullPage: false });
});

test("mobile hero keeps the CTA visible without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.waitForTimeout(900);

  const cta = page.locator('[data-testid="hero-primary-cta"]:visible');
  await expect(cta).toBeVisible();
  const ctaBox = await cta.boundingBox();
  expect(ctaBox).not.toBeNull();
  expect((ctaBox?.y ?? 0) + (ctaBox?.height ?? 0)).toBeLessThanOrEqual(812);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await page.screenshot({ path: path.resolve("output/aiwoven-hero-workflow-375.png"), fullPage: false });
});

test("student needs replace empty-looking proof and connect to the real workflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const needs = page.getByTestId("student-needs");
  await expect(needs).toBeVisible();
  await expect(needs).toContainText("Built around the way students actually study.");
  await expect(needs).toContainText("Stay focused during lectures");
  await expect(needs).toContainText("Make notes easier to review");
  await expect(needs).toContainText("Study actively, not passively");
  await expect(needs).toContainText("Understand every mistake");
  await expect(page.getByText("0 Students helped", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Verified Student", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Testimonial", { exact: true })).toHaveCount(0);

  await page.getByTestId("student-needs-workflow-link").click();
  await expect(page.locator("#workflow")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});

test("local credentials sign in, survive refresh, return to the product, and sign out", async ({ page }) => {
  test.skip(!localAuthConfigured, "Local credentials are not configured");
  await page.goto("/chat");
  await page.getByTestId("header-auth-signin").click();

  const form = page.getByTestId("local-credentials-form");
  await expect(form).toBeVisible();
  await form.getByLabel("Email", { exact: true }).fill(process.env.E2E_USER_EMAIL ?? "");
  await form.getByLabel("Password", { exact: true }).fill(process.env.E2E_USER_PASSWORD ?? "");
  await form.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page.getByText(process.env.E2E_USER_EMAIL ?? "", { exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(page.getByText(process.env.E2E_USER_EMAIL ?? "", { exact: true })).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Open workspace", exact: true })).toBeVisible();
  await page.goto("/chat");

  await page.getByTestId("header-auth-account").click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByTestId("header-auth-signin")).toBeVisible();
});
