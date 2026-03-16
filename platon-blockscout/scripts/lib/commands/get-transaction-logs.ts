import { arrayValue, fetchBlockscout, maybeRaw, objectValue, type CommandContext } from "./common.ts";

export async function getTransactionLogs(
  ctx: CommandContext,
  txHash: string,
  pageSize: number,
  cursor?: string,
): Promise<{ data: unknown; pagination?: { next_cursor: string | null; has_next: boolean } }> {
  const query: Record<string, string | number> = { items_count: pageSize };
  if (cursor) query.cursor = cursor;

  const { payload, pagination } = await fetchBlockscout(ctx, `/api/v2/transactions/${txHash}/logs`, query);
  const root = objectValue(payload);
  const items = arrayValue(root.items ?? root.data).map((entry) => {
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
  });

  return {
    data: maybeRaw(ctx.raw, {
      transaction_hash: txHash,
      items,
      total_returned: items.length,
    }, payload),
    pagination,
  };
}
