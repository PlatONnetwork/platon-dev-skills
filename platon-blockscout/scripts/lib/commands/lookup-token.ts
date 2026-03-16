import { arrayValue, fetchBlockscout, maybeRaw, objectValue, type CommandContext } from "./common.ts";

export async function lookupToken(ctx: CommandContext, query: string, limit: number): Promise<{ data: unknown }> {
  const { payload } = await fetchBlockscout(ctx, "/api/v2/search", { q: query });
  const root = objectValue(payload);
  const items = arrayValue(root.items ?? root.data)
    .map((entry) => objectValue(entry))
    .filter((entry) => Boolean(entry.address_hash ?? entry.address) && Boolean(entry.symbol || entry.name))
    .slice(0, limit)
    .map((entry) => ({
      address: entry.address_hash ?? entry.address ?? null,
      name: entry.name ?? null,
      symbol: entry.symbol ?? null,
      token_type: entry.token_type ?? entry.type ?? null,
      decimals: entry.decimals ?? null,
      total_supply: entry.total_supply ?? null,
      exchange_rate: entry.exchange_rate ?? null,
    }));

  return {
    data: maybeRaw(ctx.raw, {
      query,
      items,
      total_returned: items.length,
    }, payload),
  };
}
