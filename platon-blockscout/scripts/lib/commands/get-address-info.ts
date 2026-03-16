import { fetchBlockscout, maybeRaw, objectValue, type CommandContext } from "./common.ts";

export async function getAddressInfo(ctx: CommandContext, address: string): Promise<{ data: unknown }> {
  const { payload } = await fetchBlockscout(ctx, `/api/v2/addresses/${address}`);
  const info = objectValue(payload);

  return {
    data: maybeRaw(ctx.raw, {
      address,
      hash: info.hash ?? address,
      is_contract: info.is_contract ?? false,
      is_verified: info.is_verified ?? false,
      balance: info.coin_balance ?? info.balance ?? null,
      has_tokens: info.has_tokens ?? null,
      has_token_transfers: info.has_token_transfers ?? null,
      has_validated_blocks: info.has_validated_blocks ?? null,
      name: info.name ?? info.ens_domain_name ?? null,
    }, payload),
  };
}
