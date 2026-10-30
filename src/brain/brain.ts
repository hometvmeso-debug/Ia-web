import type { BrowserAction } from "../types";
import { validateTarget } from "../security/permissions";

export function planCommand(command: string): BrowserAction {
  const value = command.trim();
  if (!value) throw new Error("Écris une mission avant de lancer.");
  const urlMatch = value.match(/https?:\/\/[^\s"'<>]+/i);
  if (urlMatch && /ouvre|va sur|navigue|open|go to|visite/i.test(value)) {
    return { action: "navigate", url: validateTarget(urlMatch[0].replace(/[),.]+$/, "")).toString() };
  }
  const searchMatch = value.match(/(?:recherche|cherche|search(?: for)?|google)\s+(.+)/i);
  if (searchMatch) return { action: "search", query: searchMatch[1].trim() };
  if (/observe|analyse|lis la page|inspecte/i.test(value)) return { action: "observe" };
  throw new Error("Je n'ai pas identifié l'action. Utilise une URL explicite, une recherche Google ou les actions guidées de l'interface.");
}
