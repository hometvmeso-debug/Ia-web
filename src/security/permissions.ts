const BLOCKED_HOSTS = new Set([
  "localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal"
]);

export function validateTarget(input: string): URL {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("Adresse URL invalide."); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Seules les URL HTTP et HTTPS sont autorisées.");
  if (url.username || url.password) throw new Error("Les identifiants intégrés dans une URL sont interdits.");
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("Accès aux hôtes locaux interdit.");
  }
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(host)) {
    throw new Error("Accès aux adresses réseau privées interdit.");
  }
  return url;
}

export function isAuthorized(request: Request, env: { OPERATOR_ACCESS_KEY?: string }): boolean {
  const expected = env.OPERATOR_ACCESS_KEY;
  if (!expected || expected.length < 24) return false;
  const header = request.headers.get("Authorization") || "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (supplied.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  return diff === 0;
}

export function needsSubmitConfirmation(text: string): boolean {
  return /submit|send|envoyer|soumettre|publier|payer|purchase|delete|supprimer|confirmer/i.test(text);
}
