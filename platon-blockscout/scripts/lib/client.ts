import { DEFAULT_TIMEOUT_MS, NETWORKS, type NetworkName } from "./config.ts";

type QueryValue = string | number | boolean | null | undefined;

export type ApiRequest = {
  network: NetworkName;
  path: string;
  query?: Record<string, QueryValue>;
  timeoutMs?: number;
};

export class HttpError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

function buildUrl(network: NetworkName, path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(path, NETWORKS[network].baseUrl);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function requestJson({ network, path, query, timeoutMs = DEFAULT_TIMEOUT_MS }: ApiRequest): Promise<unknown> {
  const url = buildUrl(network, path, query);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "platon-blockscout-skill/0.1.0",
      },
    });

    const text = await response.text();
    const body = text ? safeParseJson(text) : null;
    if (!response.ok) {
      throw new HttpError(response.status, body, `Blockscout request failed with HTTP ${response.status}`);
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
