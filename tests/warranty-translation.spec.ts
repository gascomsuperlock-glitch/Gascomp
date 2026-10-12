import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

// Chrome's page translation replaces each text node with nested <font> elements.
// React then fails to update or remove the text nodes it still references.
// This stand-in ignores translate="no" so the form itself must survive.
async function translatePage(page: Page) {
  await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const node of nodes) {
      const parent = node.parentElement;
      if (!node.data.trim() || !parent || parent.closest("script, style, textarea")) continue;
      const outer = document.createElement("font");
      const inner = document.createElement("font");
      outer.style.verticalAlign = inner.style.verticalAlign = "inherit";
      inner.textContent = `${node.data} `;
      outer.append(inner);
      node.replaceWith(outer);
    }
  });
}

test.describe("Indonesian browser without a saved language", () => {
  test.use({ locale: "id-ID" });
  test("opens the claim form in Indonesian", async ({ page }) => {
    await page.goto("/klaim-garansi");
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
    await expect(page.getByRole("button", { name: "Kirim tiket klaim", exact: true })).toBeVisible();
  });
});

test("warranty submission survives automatic page translation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  let releaseResponse = () => {};
  const held = new Promise<void>(resolve => { releaseResponse = resolve; });
  let submissions = 0;
  // All submissions are intercepted: no ticket or private evidence is saved.
  await page.route("**/warranty/claims", async route => {
    submissions++;
    if (submissions === 1) await held;
    await route.fulfill({
      status: submissions === 1 ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(submissions === 1
        ? { error: "The ticket could not be saved. Please try again." }
        : { success: true, ticketId: "GWC-20261012-ABCDEF" }),
    });
  });
  await page.route("https://wa.me/**", route => route.fulfill({ contentType: "text/html", body: "<p>Test WhatsApp handoff</p>" }));
  await page.goto("/klaim-garansi");
  const submit = page.locator('form button[type="submit"]');
  await expect(submit).toBeEnabled();
  // Translate only after hydration so the test covers updates, not hydration recovery.
  await page.waitForFunction(() => Object.keys(document.querySelector("form")!).some(key => key.startsWith("__reactFiber")));
  await translatePage(page);
  for (const [name, value] of Object.entries({
    name: "Test Warranty", whatsapp: "081234567890", email: "warranty@example.invalid",
    purchaseDate: (await page.locator('[name="purchaseDate"]').getAttribute("max"))!, store: "Test Store", orderNumber: "TEST-ONLY",
    purchasePrice: "250000", problem: "Test issue for intercepted warranty submission.",
  })) await page.locator(`[name="${name}"]`).fill(value);
  await page.getByRole("combobox").first().click();
  await page.getByRole("option").first().click();
  await page.locator('[name="invoice"]').setInputFiles({ name: "test.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });
  await page.locator('[name="damagePhotos"]').setInputFiles({ name: "test.png", mimeType: "image/png", buffer: Buffer.from("test image") });
  await page.locator('[name="damageVideo"]').setInputFiles({ name: "original.mp4", mimeType: "video/mp4", buffer: await readFile("src/features/warranty/server/fixtures/valid.mp4") });
  await page.locator('[name="agreement"]').check();
  await translatePage(page);
  await submit.click();
  await expect(submit).toBeDisabled();
  await translatePage(page);
  releaseResponse();
  await expect(page.locator("form").getByRole("alert").first()).toBeVisible();
  await expect(page.locator('[name="name"]')).toHaveValue("Test Warranty");
  await translatePage(page);
  await submit.click();
  await expect(page).toHaveURL(/wa\.me\/.*GWC-20261012-ABCDEF/);
  expect(errors).toEqual([]);
});
