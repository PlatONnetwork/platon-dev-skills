import { applyCursorParams, arrayValue, fetchBlockscout, maybeRaw, objectValue, type CommandContext } from "./common.ts";

export async function getTokenTransfers(
  ctx: CommandContext,
  address: string,
  from: string,
  to: string | undefined,
  token: string | undefined,
  pageSize: number,
  cursor?: string,
): Promise<{ data: unknown; pagination?: { next_cursor: string | null; has_next: boolean } }> {
  const query: Record<string, string | number | boolean> = {
    transaction_types: "ERC-20",
    to_address_hashes_to_include: address,
    from_address_hashes_to_include: address,
    age_from: from,
    items_count: pageSize,
  };
  if (to) query.age_to = to;
  if (token) query.token_contract_address_hashes_to_include = token;

  const { payload, pagination } = await fetchBlockscout(ctx, "/api/v2/advanced-filters", applyCursorParams(query, cursor));
  const root = objectValue(payload);
  const items = arrayValue(root.items ?? root.data).map((entry) => {
    const item = objectValue(entry);
    const tokenInfo = objectValue(item.token);
    return {
      block_number: item.block_number ?? null,
      transaction_hash: item.hash ?? item.transaction_hash ?? null,
      timestamp: item.timestamp ?? null,
      from: objectValue(item.from).hash ?? item.from_hash ?? null,
      to: objectValue(item.to).hash ?? item.to_hash ?? null,
      value: item.value ?? objectValue(item.total).value ?? null,
      token: {
        address: tokenInfo.address_hash ?? tokenInfo.address ?? item.token_contract_address_hash ?? null,
        symbol: tokenInfo.symbol ?? null,
        name: tokenInfo.name ?? null,
      },
    };
  });

  return {
    data: maybeRaw(ctx.raw, {
      address,
      age_from: from,
      age_to: to ?? null,
      token: token ?? null,
      items,
      total_returned: items.length,
    }, payload),
    pagination,
  };
}
