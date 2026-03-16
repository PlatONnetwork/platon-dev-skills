import { arrayValue, fetchBlockscout, maybeRaw, objectValue, type CommandContext } from "./common.ts";

export async function getBlockInfo(ctx: CommandContext, blockId: string, includeTxs: boolean): Promise<{ data: unknown }> {
  const { payload } = await fetchBlockscout(ctx, `/api/v2/blocks/${blockId}`);
  const block = objectValue(payload);
  const normalized: Record<string, unknown> = {
    id: blockId,
    height: block.height ?? block.number ?? null,
    hash: block.hash ?? null,
    timestamp: block.timestamp ?? null,
    miner: objectValue(block.miner).hash ?? block.miner_hash ?? block.miner ?? null,
    gas_limit: block.gas_limit ?? null,
    gas_used: block.gas_used ?? null,
    transaction_count: block.transactions_count ?? block.tx_count ?? block.transaction_count ?? null,
  };

  if (includeTxs) {
    const txPayload = await fetchBlockscout(ctx, `/api/v2/blocks/${blockId}/transactions`);
    const txRoot = objectValue(txPayload.payload);
    normalized.transaction_hashes = arrayValue(txRoot.items ?? txRoot.data).map((entry) => {
      const item = objectValue(entry);
      return item.hash ?? item.transaction_hash ?? null;
    }).filter(Boolean);
  }

  return {
    data: maybeRaw(ctx.raw, normalized, payload),
  };
}
