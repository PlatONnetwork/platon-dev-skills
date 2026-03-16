import { fetchBlockscout, maybeRaw, objectValue, type CommandContext } from "./common.ts";

function collectSourceFiles(contract: Record<string, unknown>): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];

  if (typeof contract.source_code === "string") {
    files.push({
      path: typeof contract.file_path === "string" ? contract.file_path : "contract.sol",
      content: contract.source_code,
    });
  } else if (contract.source_code != null && typeof contract.source_code === "object" && !Array.isArray(contract.source_code)) {
    for (const [path, content] of Object.entries(contract.source_code as Record<string, unknown>)) {
      if (typeof content === "string") files.push({ path, content });
    }
  }

  if (Array.isArray(contract.additional_sources)) {
    for (const entry of contract.additional_sources) {
      if (entry == null || typeof entry !== "object" || Array.isArray(entry)) continue;
      const item = entry as Record<string, unknown>;
      if (typeof item.file_path === "string" && typeof item.source_code === "string") {
        files.push({ path: item.file_path, content: item.source_code });
      }
    }
  }

  return files;
}

export async function inspectContract(ctx: CommandContext, address: string, file?: string): Promise<{ data: unknown }> {
  const { payload } = await fetchBlockscout(ctx, `/api/v2/smart-contracts/${address}`);
  const contract = objectValue(payload);
  const sourceFiles = collectSourceFiles(contract);

  if (file) {
    const match = sourceFiles.find((entry) => entry.path === file);
    if (!match) throw new Error(`Source file not found: ${file}`);
    return {
      data: maybeRaw(ctx.raw, {
        address,
        file_name: match.path,
        file_content: match.content,
      }, payload),
    };
  }

  return {
    data: maybeRaw(ctx.raw, {
      address,
      name: contract.name ?? null,
      language: contract.language ?? null,
      compiler_version: contract.compiler_version ?? null,
      license_type: contract.license_type ?? null,
      optimization_enabled: contract.optimization_enabled ?? null,
      optimization_runs: contract.optimization_runs ?? null,
      proxy_type: contract.proxy_type ?? null,
      implementations: contract.implementations ?? [],
      has_abi: Array.isArray(contract.abi),
      source_files: sourceFiles.map((entry) => entry.path),
    }, payload),
  };
}
