export interface Env {
  BROWSER: any;
  OPERATOR_KV: KVNamespace;
  ASSETS: Fetcher;
  OPERATOR_ACCESS_KEY: string;
}

export type BrowserAction =
  | { action: "navigate"; url: string }
  | { action: "search"; query: string }
  | { action: "observe" }
  | { action: "click"; text: string }
  | { action: "fill"; fields: Record<string, string | boolean> };
