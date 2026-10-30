import type { Page } from "@cloudflare/playwright";

export async function inspectPage(page: Page) {
  const data = await page.evaluate(() => {
    const text = (document.body?.innerText || "").replace(/\n{3,}/g, "\n\n").slice(0, 12000);
    const links = Array.from(document.querySelectorAll("a"))
      .filter(a => (a as HTMLAnchorElement).innerText.trim())
      .slice(0, 40)
      .map(a => ({ text: (a as HTMLAnchorElement).innerText.trim().slice(0, 180), href: (a as HTMLAnchorElement).href }));
    const fields = Array.from(document.querySelectorAll("input,textarea,select,button"))
      .slice(0, 60)
      .map((el: any, index) => ({
        index,
        tag: el.tagName.toLowerCase(),
        type: el.type || "",
        name: el.name || "",
        id: el.id || "",
        label: el.labels?.[0]?.innerText?.trim() || "",
        placeholder: el.placeholder || "",
        text: el.innerText?.trim()?.slice(0, 100) || "",
        required: Boolean(el.required),
        disabled: Boolean(el.disabled)
      }));
    return { title: document.title, url: location.href, text, links, fields };
  });
  return data;
}
