import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

for (const language of ["en", "id"]) {
  test(`constrained warranty submission preserves original evidence and recovers in ${language}`, async ({ page, context }) => {
    await context.addCookies([{ name: "gascomp-language", value: language, url: "http://127.0.0.1:3100" }]);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "deviceMemory", { value: 4 });
      // Count attempts even when preparation catches a worker failure.
      Object.assign(window, { warrantyWorkerStarts: 0 });
      window.Worker = class { constructor() {
        const tracked = window as typeof window & { warrantyWorkerStarts: number };
        tracked.warrantyWorkerStarts++;
        throw new Error("Unexpected video worker");
      } } as unknown as typeof Worker;
    });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const submissions: FormData[] = [];
    let releaseResponse = () => {};
    const firstResponse = new Promise<void>(resolve => { releaseResponse = resolve; });
    await page.route("**/warranty/claims", async route => {
      const request = route.request();
      const data = await new Response(new Uint8Array(request.postDataBuffer()!), {
        headers: { "Content-Type": request.headers()["content-type"] },
      }).formData();
      submissions.push(data);
      if (submissions.length === 1) await firstResponse;
      // All submissions are intercepted: no ticket or private evidence is saved.
      await route.fulfill({
        status: submissions.length === 1 ? 503 : 200,
        contentType: "application/json",
        body: JSON.stringify(submissions.length === 1
          ? { error: "The ticket could not be saved. Please try again." }
          : { success: true, ticketId: "GWC-20261005-ABCDEF" }),
      });
    });
    await page.route("https://wa.me/**", route => route.fulfill({ contentType: "text/html", body: "<p>Test WhatsApp handoff</p>" }));
    await page.goto("/klaim-garansi");
    await expect(page.getByRole('button', { name: language === 'id' ? 'Kirim tiket klaim' : 'Submit claim ticket', exact: true })).toBeEnabled();
    for (const [name, value] of Object.entries({
      name: "Test Warranty", whatsapp: "081234567890", email: "warranty@example.invalid",
      purchaseDate: (await page.locator('[name="purchaseDate"]').getAttribute("max"))!, store: "Test Store", orderNumber: "TEST-ONLY",
      purchasePrice: "250000", problem: "Test issue for intercepted warranty submission.",
    })) await page.locator(`[name="${name}"]`).fill(value);
    await page.getByRole("combobox").first().click();
    await page.getByRole("option").first().click();
    await page.locator('[name="invoice"]').setInputFiles({ name: "test.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });
    await page.locator('[name="damagePhotos"]').setInputFiles({ name: "test.png", mimeType: "image/png", buffer: Buffer.from("test image") });
    const bytes = await readFile("src/features/warranty/server/fixtures/valid.mp4");
    // Exceed the compression threshold without introducing customer data.
    const video = Buffer.concat([bytes, Buffer.alloc(3 * 1024 * 1024)]);
    await page.locator('[name="damageVideo"]').setInputFiles({ name: "original.mp4", mimeType: "video/mp4", buffer: video });
    await expect(page.getByRole("status").filter({ hasText: language === "id" ? "Video asli siap" : "The original video is ready" })).toBeVisible();
    await page.locator('[name="agreement"]').check();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: language === 'id' ? 'Kirim tiket klaim' : 'Submit claim ticket', exact: true }).click();
    await expect(page.getByRole('button', { name: language === 'id' ? 'Mengirim klaim...' : 'Submitting claim...', exact: true })).toBeDisabled();
    releaseResponse();
    const alert = page.locator("form").getByRole("alert");
    await expect(alert).toContainText(language === "id" ? "Tiket tidak dapat disimpan" : "The ticket could not be saved");
    await expect(alert).toBeFocused();
    await expect(page.locator('[name="name"]')).toHaveValue("Test Warranty");
    await expect(page.locator('[name="agreement"]')).toBeChecked();
    expect(await page.locator('[name="damageVideo"]').evaluate((input: HTMLInputElement) => input.files?.[0].size)).toBe(video.length);
    expect(submissions).toHaveLength(1);
    const submittedVideo = submissions[0].get("damageVideo") as File;
    expect(submittedVideo.name).toBe("original.mp4");
    expect(Buffer.from(await submittedVideo.arrayBuffer()).equals(video)).toBe(true);
    expect(await page.evaluate(() => (window as typeof window & { warrantyWorkerStarts: number }).warrantyWorkerStarts)).toBe(0);
    await page.getByRole('button', { name: language === 'id' ? 'Kirim tiket klaim' : 'Submit claim ticket', exact: true }).click();
    await expect(page).toHaveURL(/wa\.me\/.*GWC-20261005-ABCDEF/);
    expect(submissions).toHaveLength(2);
    expect(errors).toEqual([]);
  });
}
