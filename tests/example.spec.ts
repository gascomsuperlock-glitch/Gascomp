import { expect, test } from "@playwright/test";

test("public catalog loads without a browser error", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator("main#main-content")).toBeVisible();
  await expect(page.locator('a[href="/klaim-garansi"]').first()).toBeVisible();
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("admin login remains accessible", async ({ page }) => {
  const response = await page.goto("/admin/login");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in to dashboard" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
