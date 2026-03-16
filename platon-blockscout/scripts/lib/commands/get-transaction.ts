import { arrayValue, fetchBlockscout, maybeRaw, objectValue, type CommandContext } from "./common.ts";

export async function getTransaction(ctx: CommandContext, txHash: string): Promise<{ data: unknown }> {
  const { payload } = await fetchBlockscout(ctx, `/api/v2/transactions/${txHash}`);
  const tx = objectValue(payload);
  const tokenTransfers = arrayValue(tx.token_transfers).map((entry) => {
    const item = objectValue(entry);
    const token = objectValue(item.token);
    return {
      from: objectValue(item.from).hash ?? item.from_hash ?? null,
      to: objectValue(item.to).hash ?? item.to_hash ?? null,
      value: objectValue(item.total).value ?? item.amount ?? item.value ?? null,
      token: {
        address: token.address_hash ?? token.address ?? null,
        symbol: token.symbol ?? null,
        name: token.name ?? null,
      },
    };
  });

  return {
    data: maybeRaw(ctx.raw, {
      hash: txHash,
      status: tx.status ?? tx.result ?? null,
      block_number: tx.block_number ?? null,
      timestamp: tx.timestamp ?? null,
      from: objectValue(tx.from).hash ?? tx.from_hash ?? null,
      to: objectValue(tx.to).hash ?? tx.to_hash ?? null,
      value: tx.value ?? null,
      gas_used: tx.gas_used ?? null,
      gas_price: tx.gas_price ?? null,
      method: objectValue(tx.decoded_input).method_call ?? tx.method ?? null,
      decoded_input: tx.decoded_input ?? null,
      token_transfers: tokenTransfers,
      raw_input: ctx.raw ? tx.raw_input ?? null : undefined,
    }, payload),
  };
}
