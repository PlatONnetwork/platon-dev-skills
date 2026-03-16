import { arrayValue, fetchBlockscout, maybeRaw, objectValue, type CommandContext } from "./common.ts";

export async function getAddressLogs(
  ctx: CommandContext,
  address: string,
  pageSize: number,
  cursor?: string,
): Promise<{ data: unknown; pagination?: { next_cursor: string | null; has_next: boolean } }> {
  const query: Record<string, string | number> = { items_count: pageSize };
  if (cursor) query.cursor = cursor;

  const { payload, pagination } = await fetchBlockscout(ctx, `/api/v2/addresses/${address}/logs`, query);
  const root = objectValue(payload);
  const items = arrayValue(root.items ?? root.data).map((entry) => {
    const item = objectValue(entry);
    return {
      block_number: item.block_number ?? null,
      transaction_hash: item.transaction_hash ?? null,
      index: item.index ?? item.log_index ?? null,
      topics: arrayValue(item.topics),
      data: item.data ?? null,
      decoded: item.decoded ?? null,
      data_truncated: item.data_truncated ?? false,
    };
  });

  return {
    data: maybeRaw(ctx.raw, {
      address,
      items,
      total_returned: items.length,
    }, payload),
    pagination,
  };
}
