import type { BrowserAction } from "../types";
import { validateTarget } from "../security/permissions";

export function validateAction(input: any): BrowserAction {
  if (!input || typeof input !== "object" || typeof input.action !== "string") {
    throw new Error("Action manquante.");
  }
  switch (input.action) {
    case "navigate":
      if (typeof input.url !== "string") throw new Error("URL manquante.");
      return { action: "navigate", url: validateTarget(input.url).toString() };
    case "search":
      if (typeof input.query !== "string" || !input.query.trim()) throw new Error("Recherche vide.");
      return { action: "search", query: input.query.trim().slice(0, 300) };
    case "observe":
      return { action: "observe" };
    case "click":
      if (typeof input.text !== "string" || !input.text.trim()) throw new Error("Texte du lien/bouton manquant.");
      return { action: "click", text: input.text.trim().slice(0, 180) };
    case "fill": {
      if (!input.fields || typeof input.fields !== "object" || Array.isArray(input.fields)) throw new Error("Fournis les champs à remplir sous forme d'objet.");
      const entries = Object.entries(input.fields);
      if (!entries.length || entries.length > 25) throw new Error("Le formulaire doit contenir entre 1 et 25 champs.");
      const fields: Record<string, string | boolean> = {};
      for (const [key, value] of entries) {
        if (typeof value !== "string" && typeof value !== "boolean") throw new Error(`Valeur invalide pour ${key}.`);
        fields[key.slice(0, 120)] = typeof value === "string" ? value.slice(0, 2000) : value;
      }
      return { action: "fill", fields };
    }
    default:
      throw new Error("Action non prise en charge.");
  }
}
