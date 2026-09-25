import { expect, test } from "@playwright/test";

for (const language of ["en", "id"]) {
  test(`public navigation adapts without wrapping in ${language}`, async ({ page, context }) => {
    await context.addCookies([{ name: "gascomp-language", value: language, url: "http://127.0.0.1:3100" }]);
    await page.goto("/");
    const header = page.locator("header").first();
    const nav = header.getByRole("navigation");
    const menu = header.getByRole("button", { name: "Menu", exact: true });
    for (const width of [320, 375, 640, 768, 1024, 1099, 1100, 1280, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      if (width < 1100) {
        await expect(menu).toBeVisible();
        await expect(nav).toBeHidden();
        await menu.click();
        await expect(nav).toBeVisible();
      } else {
        await expect(menu).toBeHidden();
        await expect(nav).toBeVisible();
      }
      await expect(nav.locator("a")).toHaveCount(6);
      for (const link of await nav.locator("a").all()) await expect(link).toBeVisible();
      const bounds = await header.evaluate((element) => {
        const headerBox = element.getBoundingClientRect();
        return {
          height: headerBox.height,
          fits: [...element.querySelectorAll("a, button")].filter((item) => item.getClientRects().length).every((item) => {
            const box = item.getBoundingClientRect();
            return box.left >= 0 && box.right <= innerWidth;
          }),
          overlap: (() => {
            const brand = element.querySelector("a")!.getBoundingClientRect();
            const navigation = element.querySelector("nav")!.getBoundingClientRect();
            return innerWidth >= 1100 && brand.right > navigation.left;
          })(),
        };
      });
      expect(bounds.fits).toBe(true);
      expect(bounds.overlap).toBe(false);
      expect(bounds.height).toBeLessThanOrEqual(74);
      if (width < 1100) {
        await page.keyboard.press("Escape");
        await expect(nav).toBeHidden();
        await expect(menu).toBeFocused();
      }
    }
  });
}

test("dropdown supports dismissal, language changes, navigation and short screens", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 440 });
  await page.goto("/");
  const header = page.locator("header").first();
  const nav = header.getByRole("navigation");
  const menu = header.getByRole("button", { name: "Menu", exact: true });
  await menu.click();
  await nav.getByRole("button", { name: "Bahasa Indonesia", exact: true }).click();
  await expect(nav).toBeVisible();
  await expect(header.getByRole("button", { name: "Tutup", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Panduan Produk", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Hubungi bantuan", exact: true }).click();
  await expect(page).toHaveURL(/#hubungi$/);
  await expect(nav).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 0));
  await menu.click();
  await page.setViewportSize({ width: 375, height: 800 });
  await page.mouse.click(5, 790);
  await expect(nav).toBeHidden();
  await menu.click();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(menu).toBeHidden();
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(nav).toBeHidden();
  await menu.click();
  await nav.getByRole("link", { name: "Service Center", exact: true }).click();
  await expect(page).toHaveURL(/\/service-center$/);
  await expect(nav).toBeHidden();
});
