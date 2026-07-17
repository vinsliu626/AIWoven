import { expect, test } from "@playwright/test";

test("desktop workspace navigation collapses, expands the chat, and persists", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/chat");
  await page.evaluate(() => localStorage.removeItem("aiwoven:chat-sidebar-collapsed"));
  await page.reload();

  const nav = page.getByTestId("desktop-workspace-nav");
  const main = page.getByTestId("chat-main-content");
  const composer = page.getByTestId("chat-composer");
  const toggle = page.getByTestId("workspace-nav-toggle");
  await expect(nav).toBeVisible();
  await expect(nav).toHaveAttribute("data-collapsed", "false");
  await expect(page.getByRole("link", { name: "Chat", exact: true }).first()).toHaveAttribute("aria-current", "page");

  const expandedNavWidth = (await nav.boundingBox())?.width ?? 0;
  const expandedMainWidth = (await main.boundingBox())?.width ?? 0;
  const expandedComposerWidth = (await composer.boundingBox())?.width ?? 0;
  expect(expandedNavWidth).toBeGreaterThanOrEqual(230);
  expect(expandedNavWidth).toBeLessThanOrEqual(240);

  await toggle.click();
  await expect(nav).toHaveAttribute("data-collapsed", "true");
  await expect(toggle).toHaveAttribute("aria-label", "Expand sidebar");
  await expect.poll(async () => (await nav.boundingBox())?.width ?? 0).toBeLessThanOrEqual(82);
  const collapsedMainWidth = (await main.boundingBox())?.width ?? 0;
  const collapsedComposerWidth = (await composer.boundingBox())?.width ?? 0;
  expect(collapsedMainWidth - expandedMainWidth).toBeGreaterThan(140);
  expect(collapsedComposerWidth - expandedComposerWidth).toBeGreaterThan(100);

  const collapsedChatLink = page.getByRole("link", { name: "Chat", exact: true }).first();
  await collapsedChatLink.hover();
  await expect(page.getByRole("tooltip", { name: "Chat" })).toBeVisible();

  await page.reload();
  await expect(nav).toHaveAttribute("data-collapsed", "true");
  await expect.poll(async () => (await nav.boundingBox())?.width ?? 0).toBeLessThanOrEqual(82);
  await expect(page.getByTestId("chat-main-content")).toBeVisible();

  const textarea = page.locator("textarea").first();
  if (await textarea.count()) {
    const box = await textarea.boundingBox();
    expect(box?.x ?? 0).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(1366);
  }
});

test("mobile workspace navigation remains an overlay drawer", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/chat");

  await expect(page.getByTestId("desktop-workspace-nav")).toBeHidden();
  const openButton = page.getByRole("button", { name: "Open workspace navigation" });
  await openButton.click();
  const drawer = page.getByTestId("mobile-workspace-nav");
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveAttribute("data-collapsed", "false");

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();

  await openButton.click();
  await drawer.getByRole("link", { name: "Note", exact: true }).click();
  await expect(page).toHaveURL(/\/ai-note/);
  await expect(page.getByTestId("mobile-workspace-nav")).toHaveCount(0);
});
