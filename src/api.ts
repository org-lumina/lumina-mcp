/**
 * Thin fetch wrapper around the Lumina REST API. Uses the global `fetch`
 * (Node >= 18). All write/signature concerns live elsewhere — this module only
 * does read/sandbox HTTP and surfaces clean errors.
 */
import { CONFIG } from "./config.js";

export class LuminaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "LuminaApiError";
  }
}

type Json = Record<string, unknown>;

async function request<T = Json>(
  method: "GET" | "POST",
  path: string,
  opts: { body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const url = `${CONFIG.apiBase}${path}`;
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.auth && CONFIG.apiKey) headers["authorization"] = `Bearer ${CONFIG.apiKey}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    throw new LuminaApiError(
      `Network error reaching Lumina API (${url}): ${(e as Error).message}`,
      0,
    );
  }

  const text = await res.text();
  let parsed: unknown = undefined;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    const p = parsed as { message?: string; error?: string } | undefined;
    throw new LuminaApiError(
      p?.message ?? `HTTP ${res.status} for ${path}`,
      res.status,
      p?.error,
    );
  }
  return parsed as T;
}

export const api = {
  get: <T = Json>(path: string, auth = false) => request<T>("GET", path, { auth }),
  post: <T = Json>(path: string, body: unknown, auth = false) =>
    request<T>("POST", path, { body, auth }),
};

/** Resolve the live canonical contract addresses from `/health` (redeploy-proof). */
export async function getContracts(): Promise<Record<string, string>> {
  const h = await api.get<{ contracts: Record<string, string> }>("/health");
  if (!h.contracts) throw new LuminaApiError("/health returned no contracts map", 502);
  return h.contracts;
}
