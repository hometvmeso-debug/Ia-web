import type { Env } from "../types";

const HISTORY_KEY = "operator:history";
const STORAGE_KEY = "operator:browser-storage";
const LAST_URL_KEY = "operator:last-url";
const PENDING_PREFIX = "operator:pending:";

export async function addHistory(env: Env, entry: Record<string, unknown>) {
  const old = await env.OPERATOR_KV.get(HISTORY_KEY, "json") as any[] | null;
  const list = Array.isArray(old) ? old : [];
  list.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), ...entry });
  await env.OPERATOR_KV.put(HISTORY_KEY, JSON.stringify(list.slice(0, 60)));
}

export async function getHistory(env: Env) {
  return await env.OPERATOR_KV.get(HISTORY_KEY, "json") || [];
}

export async function getStorageState(env: Env) {
  return await env.OPERATOR_KV.get(STORAGE_KEY, "json") as any || undefined;
}

export async function saveStorageState(env: Env, state: unknown) {
  if (state) await env.OPERATOR_KV.put(STORAGE_KEY, JSON.stringify(state), { expirationTtl: 60 * 60 * 24 * 7 });
}

export async function savePending(env: Env, id: string, pending: unknown) {
  await env.OPERATOR_KV.put(PENDING_PREFIX + id, JSON.stringify(pending), { expirationTtl: 600 });
}

export async function readPending(env: Env, id: string) {
  const value = await env.OPERATOR_KV.get(PENDING_PREFIX + id, "json") as any;
  return value;
}

export async function deletePending(env: Env, id: string) {
  await env.OPERATOR_KV.delete(PENDING_PREFIX + id);
}

export async function getLastUrl(env: Env) {
  return await env.OPERATOR_KV.get(LAST_URL_KEY);
}

export async function saveLastUrl(env: Env, url: string) {
  await env.OPERATOR_KV.put(LAST_URL_KEY, url, { expirationTtl: 60 * 60 * 24 });
}
