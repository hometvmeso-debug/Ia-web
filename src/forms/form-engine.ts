import type { Page } from "@cloudflare/playwright";

function escapeAttribute(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function fillForm(page: Page, fields: Record<string, string | boolean>) {
  const completed: string[] = [];
  const failed: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    const safe = escapeAttribute(key);
    const candidates = [
      page.locator(`[name="${safe}"]`).first(),
      page.locator(`[id="${safe}"]`).first(),
      page.locator(`[placeholder="${safe}"]`).first(),
      page.getByLabel(key, { exact: false }).first()
    ];
    let done = false;
    for (const locator of candidates) {
      try {
        if (await locator.count() === 0) continue;
        const tag = await locator.evaluate((el: any) => el.tagName.toLowerCase());
        const type = await locator.getAttribute("type");
        if (tag === "select") {
          await locator.selectOption(String(value));
        } else if (type === "checkbox" || type === "radio") {
          if (Boolean(value)) await locator.check(); else await locator.uncheck();
        } else if (["textarea", "input"].includes(tag)) {
          await locator.fill(String(value));
        } else continue;
        completed.push(key);
        done = true;
        break;
      } catch { /* try the next matching locator */ }
    }
    if (!done) failed.push(key);
  }
  return { completed, failed };
}

export async function submitForm(page: Page) {
  const buttons = page.locator('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Send"), button:has-text("Envoyer"), button:has-text("Soumettre")');
  if (await buttons.count()) {
    await buttons.first().click();
  } else {
    const form = page.locator("form").first();
    if (!(await form.count())) throw new Error("Aucun formulaire détecté pour l'envoi.");
    await form.evaluate((el: HTMLFormElement) => el.requestSubmit());
  }
  await page.waitForTimeout(1200);
}
