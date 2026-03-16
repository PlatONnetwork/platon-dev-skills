import { applyCursorParams, arrayValue, fetchBlockscout, maybeRaw, objectValue, type CommandContext } from "./common.ts";

export async function getNfts(ctx: CommandContext, address: string, pageSize: number, cursor?: string, includeInstances = false): Promise<{ data: unknown; pagination?: { next_cursor: string | null; has_next: boolean } }> {
  const query: Record<string, string | number> = { type: "ERC-721,ERC-404,ERC-1155", items_count: pageSize };
  const { payload, pagination } = await fetchBlockscout(ctx, `/api/v2/addresses/${address}/nft/collections`, applyCursorParams(query, cursor));
  const root = objectValue(payload);
  const items = arrayValue(root.items ?? root.data).map((entry) => {
    const item = objectValue(entry);
    const collection = objectValue(item.collection ?? item.token ?? item);
    const tokenInstances = includeInstances ? arrayValue(item.token_instances).map((instance) => {
      const token = objectValue(instance);
      return {
        id: token.id ?? token.token_id ?? null,
        name: token.name ?? null,
        description: token.description ?? null,
        image_url: token.image_url ?? null,
      };
    }) : undefined;
    return {
      address: collection.address_hash ?? collection.address ?? item.token_address ?? null,
      name: collection.name ?? item.name ?? null,
      symbol: collection.symbol ?? item.symbol ?? null,
      type: collection.type ?? item.type ?? null,
      amount: item.amount ?? item.balance ?? null,
      ...(tokenInstances ? { token_instances: tokenInstances } : {}),
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
