import { fetchBlockscout, maybeRaw, objectValue, type CommandContext } from "./common.ts";

export async function getContractAbi(ctx: CommandContext, address: string): Promise<{ data: unknown }> {
  const { payload } = await fetchBlockscout(ctx, `/api/v2/smart-contracts/${address}`);
  const contract = objectValue(payload);
  const abi = contract.abi;

  if (!Array.isArray(abi)) {
    throw new Error("Contract ABI is not available for this address");
  }

  return {
    data: maybeRaw(ctx.raw, {
      address,
      contract_name: contract.name ?? contract.smart_contract?.name ?? null,
      is_verified: true,
      abi,
    }, payload),
  };
}
