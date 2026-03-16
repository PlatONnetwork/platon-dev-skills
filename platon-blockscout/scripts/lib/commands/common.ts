import { getPaginationEnvelope } from "../pagination.ts";
import { requestJson } from "../client.ts";
import type { NetworkName } from "../config.ts";

export type CommandContext = {
  command: string;
  network: NetworkName;
  raw: boolean;
  timeoutMs?: number;
};

type UnknownRecord = Record<string, unknown>;

export function objectValue(value: unknown): UnknownRecord {
  return value != null && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

export function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function parseJsonCursor(cursor?: string): UnknownRecord | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(cursor);
    return parsed != null && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as UnknownRecord) : null;
  } catch {
    return null;
  }
}

export function applyCursorParams(
  query: Record<string, string | number | boolean | null | undefined>,
  cursor?: string,
): Record<string, string | number | boolean | null | undefined> {
  const parsed = parseJsonCursor(cursor);
  if (parsed) {
    const nextQuery = { ...query };
    for (const [key, value] of Object.entries(parsed)) {
      if (value == null || typeof value === "object") continue;
      nextQuery[key] = value as string | number | boolean;
    }
    return nextQuery;
  }

  if (cursor) {
    return {
      ...query,
      cursor,
    };
  }

  return query;
}

export async function fetchBlockscout(ctx: CommandContext, path: string, query?: Record<string, string | number | boolean | null | undefined>): Promise<{ payload: unknown; pagination?: { next_cursor: string | null; has_next: boolean } }> {
  const payload = await requestJson({
    network: ctx.network,
    path,
    query,
    timeoutMs: ctx.timeoutMs,
  });
  return {
    payload,
    pagination: getPaginationEnvelope(payload),
  };
}

export function maybeRaw<T>(raw: boolean, normalized: T, upstream: unknown): T | { normalized: T; raw: unknown } {
  return raw ? { normalized, raw: upstream } : normalized;
}
