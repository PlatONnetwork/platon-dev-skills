import { arrayValue, fetchBlockscout, maybeRaw, objectValue, parseJsonCursor, type CommandContext } from "./common.ts";

type PaginationState = {
  kind: "log_page_v1";
  upstream: Record<string, string | number | boolean> | null;
  offset: number;
};

type QueryRecord = Record<string, string | number | boolean>;

function isPaginationState(value: unknown): value is PaginationState {
  return (
    value != null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).kind === "log_page_v1"
  );
}

function parseLogCursor(cursor?: string): PaginationState {
  const parsed = parseJsonCursor(cursor);
  if (isPaginationState(parsed)) return parsed;
  if (parsed) {
    const upstream: QueryRecord = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value == null || typeof value === "object") continue;
      upstream[key] = value as string | number | boolean;
    }
    return { kind: "log_page_v1", upstream, offset: 0 };
  }
  return { kind: "log_page_v1", upstream: null, offset: 0 };
}

function encodeLogCursor(upstream: QueryRecord | null, offset: number): string {
  return JSON.stringify({
    kind: "log_page_v1",
    upstream,
    offset,
  } satisfies PaginationState);
}

function normalizeLogItem(entry: unknown): Record<string, unknown> {
  const item = objectValue(entry);
  return {
    address: objectValue(item.address).hash ?? item.address ?? null,
    block_number: item.block_number ?? null,
    index: item.index ?? item.log_index ?? null,
    topics: arrayValue(item.topics),
    data: item.data ?? null,
    decoded: item.decoded ?? null,
    data_truncated: item.data_truncated ?? false,
  };
}

export async function getTransactionLogs(
  ctx: CommandContext,
  txHash: string,
  pageSize: number,
  cursor?: string,
): Promise<{ data: unknown; pagination?: { next_cursor: string | null; has_next: boolean } }> {
  const state = parseLogCursor(cursor);
  let upstream = state.upstream;
  let offset = state.offset;
  const collected: Record<string, unknown>[] = [];
  const rawPages: unknown[] = [];
  let pagination: { next_cursor: string | null; has_next: boolean } | undefined;

  while (collected.length < pageSize) {
    const query: QueryRecord = {};
    if (upstream) {
      Object.assign(query, upstream);
    } else {
      query.items_count = pageSize;
    }

    const { payload } = await fetchBlockscout(ctx, `/api/v2/transactions/${txHash}/logs`, query);
    rawPages.push(payload);
    const root = objectValue(payload);
    const batch = arrayValue(root.items ?? root.data).map(normalizeLogItem);
    const remaining = batch.slice(offset);
    const needed = pageSize - collected.length;
    const take = remaining.slice(0, needed);
    collected.push(...take);

    if (take.length < remaining.length) {
      pagination = {
        next_cursor: encodeLogCursor(upstream, offset + take.length),
        has_next: true,
      };
      break;
    }

    const nextPage = objectValue(root.next_page_params);
    if (Object.keys(nextPage).length === 0) {
      pagination = {
        next_cursor: null,
        has_next: false,
      };
      break;
    }

    upstream = {};
    for (const [key, value] of Object.entries(nextPage)) {
      if (value == null || typeof value === "object") continue;
      upstream[key] = value as string | number | boolean;
    }
    offset = 0;
    if (collected.length >= pageSize) {
      pagination = {
        next_cursor: encodeLogCursor(upstream, 0),
        has_next: true,
      };
      break;
    }
  }

  return {
    data: maybeRaw(ctx.raw, {
      transaction_hash: txHash,
      items: collected,
      total_returned: collected.length,
    }, rawPages.length === 1 ? rawPages[0] : rawPages),
    pagination,
  };
}
