import { applyCursorParams, arrayValue, fetchBlockscout, maybeRaw, objectValue, type CommandContext } from "./common.ts";

export async function getTokens(ctx: CommandContext, address: string, pageSize: number, cursor?: string): Promise<{ data: unknown; pagination?: { next_cursor: string | null; has_next: boolean } }> {
  const query: Record<string, string | number> = { type: "ERC-20", items_count: pageSize };
  const { payload, pagination } = await fetchBlockscout(ctx, `/api/v2/addresses/${address}/tokens`, applyCursorParams(query, cursor));
  const root = objectValue(payload);
  const items = arrayValue(root.items ?? root.data).map((entry) => {
    const item = objectValue(entry);
    const token = objectValue(item.token ?? item);
    return {
      address: token.address_hash ?? token.address ?? item.token_address ?? null,
      name: token.name ?? item.name ?? null,
      symbol: token.symbol ?? item.symbol ?? null,
      decimals: token.decimals ?? item.decimals ?? null,
      total_supply: token.total_supply ?? item.total_supply ?? null,
      exchange_rate: token.exchange_rate ?? item.exchange_rate ?? null,
      balance: item.value ?? item.balance ?? null,
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
