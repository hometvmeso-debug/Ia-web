import type { Env } from "./types";
import { isAuthorized } from "./security/permissions";
import { planCommand } from "./brain/brain";
import { validateAction } from "./planner/planner";
import { runBrowserAction, confirmFormSubmission } from "./browser/browser-engine";
import { addHistory, getHistory } from "./memory/mission-memory";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

async function readBody(request: Request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 20000) throw new Error("Requête trop volumineuse.");
  return await request.json() as any;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    if (!isAuthorized(request, env)) return json({ error: "Accès refusé. Vérifie la clé d'accès." }, 401);

    try {
      if (url.pathname === "/api/health" && request.method === "GET") {
        return json({ ok: true, service: "NEXCORE OPERATOR", version: "1.0.0", browserRun: Boolean(env.BROWSER), kv: Boolean(env.OPERATOR_KV) });
      }
      if (url.pathname === "/api/history" && request.method === "GET") return json({ history: await getHistory(env) });

      if (url.pathname === "/api/mission" && request.method === "POST") {
        const body = await readBody(request);
        const action = planCommand(String(body.command || ""));
        const result = await runBrowserAction(env, action);
        await addHistory(env, { command: body.command, action: action.action, url: (result as any).url, status: "success" });
        return json({ plan: action, result });
      }

      if (url.pathname === "/api/act" && request.method === "POST") {
        const body = await readBody(request);
        const action = validateAction(body);
        const result = await runBrowserAction(env, action);
        await addHistory(env, { action: action.action, url: (result as any).url, status: "success" });
        return json({ result });
      }

      if (url.pathname === "/api/confirm-submit" && request.method === "POST") {
        const body = await readBody(request);
        if (typeof body.confirmationId !== "string") return json({ error: "Identifiant de confirmation manquant." }, 400);
        const result = await confirmFormSubmission(env, body.confirmationId);
        await addHistory(env, { action: "submit", url: result.url, status: "submitted" });
        return json({ result });
      }

      return json({ error: "Route API inconnue." }, 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur interne.";
      await addHistory(env, { action: "error", status: "error", message: message.slice(0, 250) }).catch(() => {});
      return json({ error: message }, 400);
    }
  }
};
