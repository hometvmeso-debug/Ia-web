import { launch } from "@cloudflare/playwright";
import type { Env, BrowserAction } from "../types";
import { inspectPage } from "../vision/vision";
import { fillForm, submitForm } from "../forms/form-engine";
import { getStorageState, saveStorageState, savePending, readPending, deletePending, getLastUrl, saveLastUrl } from "../memory/mission-memory";
import { validateTarget } from "../security/permissions";

const MAX_TEXT = 12000;

export async function runBrowserAction(env: Env, action: BrowserAction) {
  if (!env.BROWSER) throw new Error("Le binding Browser Run BROWSER n'est pas configuré.");
  const browser = await launch(env.BROWSER);
  try {
    const storageState = await getStorageState(env);
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);

    if (action.action !== "navigate" && action.action !== "search") {
      const lastUrl = await getLastUrl(env);
      if (!lastUrl) throw new Error("Aucune page active. Commence par ouvrir un site ou lancer une recherche.");
      await page.goto(validateTarget(lastUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
    }

    if (action.action === "navigate") {
      await page.goto(validateTarget(action.url).toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
    } else if (action.action === "search") {
      await page.goto("https://www.google.com/search?q=" + encodeURIComponent(action.query), { waitUntil: "domcontentloaded", timeout: 30000 });
    } else if (action.action === "click") {
      const target = page.getByText(action.text, { exact: false }).first();
      if (!(await target.count())) throw new Error(`Élément introuvable : ${action.text}`);
      const tag = await target.evaluate((el: any) => el.closest("a,button,[role=button]")?.tagName?.toLowerCase() || el.tagName.toLowerCase());
      if (!["a", "button"].includes(tag)) throw new Error("La cible ne semble pas être un lien ou un bouton. Utilise le mode observation.");
      await target.click();
      await page.waitForLoadState("domcontentloaded").catch(() => {});
    } else if (action.action === "fill") {
      const result = await fillForm(page, action.fields);
      const confirmationId = crypto.randomUUID();
      await savePending(env, confirmationId, { url: page.url(), fields: action.fields, storageState: await context.storageState({ indexedDB: true }) });
      const snapshot = await inspectPage(page);
      await saveStorageState(env, await context.storageState({ indexedDB: true }));
      await saveLastUrl(env, page.url());
      return {
        action: "fill",
        title: snapshot.title,
        url: snapshot.url,
        completed: result.completed,
        failed: result.failed,
        confirmationId,
        requiresConfirmation: true,
        message: "Les champs ont été préparés. Aucun formulaire n'a été envoyé. Vérifie les données puis confirme explicitement l'envoi."
      };
    }

    const snapshot = await inspectPage(page);
    const state = await context.storageState({ indexedDB: true }).catch(() => undefined);
    await saveStorageState(env, state);
    await saveLastUrl(env, page.url());
    const screenshot = await page.screenshot({ type: "jpeg", quality: 55, fullPage: false }).catch(() => undefined);
    return {
      action: action.action,
      title: snapshot.title,
      url: snapshot.url,
      text: snapshot.text.slice(0, MAX_TEXT),
      links: snapshot.links,
      fields: snapshot.fields,
      screenshot: screenshot ? `data:image/jpeg;base64,${bytesToBase64(screenshot)}` : undefined
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

export async function confirmFormSubmission(env: Env, confirmationId: string) {
  const pending = await readPending(env, confirmationId);
  if (!pending) throw new Error("Confirmation expirée ou inconnue. Prépare à nouveau le formulaire.");
  const browser = await launch(env.BROWSER);
  try {
    const context = await browser.newContext({ storageState: pending.storageState });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    await page.goto(validateTarget(pending.url).toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
    const filled = await fillForm(page, pending.fields);
    if (filled.failed.length) throw new Error("Soumission annulée : certains champs n'ont pas pu être reconstitués (" + filled.failed.join(", ") + ").");
    await submitForm(page);
    const snapshot = await inspectPage(page);
    await saveStorageState(env, await context.storageState({ indexedDB: true }).catch(() => undefined));
    await deletePending(env, confirmationId);
    return { action: "submit", title: snapshot.title, url: snapshot.url, text: snapshot.text.slice(0, 5000), message: "Le formulaire a été soumis après confirmation explicite." };
  } finally {
    await browser.close().catch(() => {});
  }
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
