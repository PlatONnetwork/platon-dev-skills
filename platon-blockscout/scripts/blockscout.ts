#!/usr/bin/env node

import { HttpError } from "./lib/client.ts";
import { failure, printJson, success } from "./lib/format.ts";
import { normalizeNetwork } from "./lib/config.ts";
import { assertAddress, assertBlockId, assertIsoDateTime, assertTxHash, parsePageSize } from "./lib/validate.ts";
import { lookupToken } from "./lib/commands/lookup-token.ts";
import { getContractAbi } from "./lib/commands/get-contract-abi.ts";
import { inspectContract } from "./lib/commands/inspect-contract.ts";
import { getAddressInfo } from "./lib/commands/get-address-info.ts";
import { getTokens } from "./lib/commands/get-tokens.ts";
import { getNfts } from "./lib/commands/get-nfts.ts";
import { getBlockInfo } from "./lib/commands/get-block-info.ts";
import { getTransaction } from "./lib/commands/get-transaction.ts";
import { getTransactionLogs } from "./lib/commands/get-transaction-logs.ts";
import { getTransactions } from "./lib/commands/get-transactions.ts";
import { getTokenTransfers } from "./lib/commands/get-token-transfers.ts";
import { getAddressLogs } from "./lib/commands/get-address-logs.ts";

type Flags = Map<string, string | true>;

function usage(exitCode = 1): never {
  const text = `Usage:
  node platon-blockscout/scripts/blockscout.ts <command> [args] [options]

Commands:
  lookup-token <query> [--limit N]
  get-contract-abi <address>
  inspect-contract <address> [--file path]
  get-address-info <address>
  get-tokens <address> [--page-size N] [--cursor token]
  get-nfts <address> [--page-size N] [--cursor token] [--include-instances]
  get-block-info <number|hash> [--include-txs]
  get-transaction <hash>
  get-transaction-logs <hash> [--page-size N] [--cursor token]
  get-address-logs <address> [--page-size N] [--cursor token]
  get-transactions <address> --from <iso8601> [--to <iso8601>] [--methods sigs]
  get-token-transfers <address> --from <iso8601> [--to <iso8601>] [--token <address>]

Global options:
  --network <mainnet|devnet>
  --page-size <n>
  --cursor <token>
  --timeout-ms <n>
  --raw
  --help`;
  process.stdout.write(`${text}\n`);
  process.exit(exitCode);
}

function parseArgv(argv: string[]): { command: string; positionals: string[]; flags: Flags } {
  const [command, ...rest] = argv;
  if (!command) usage();
  if (command === "--help" || command === "-h") usage(0);
  const positionals: string[] = [];
  const flags: Flags = new Map();

  for (let i = 0; i < rest.length; i += 1) {
    const part = rest[i];
    if (!part.startsWith("--")) {
      positionals.push(part);
      continue;
    }
    const key = part.slice(2);
    const next = rest[i + 1];
    if (!next || next.startsWith("--")) {
      flags.set(key, true);
      continue;
    }
    flags.set(key, next);
    i += 1;
  }

  return { command, positionals, flags };
}

function getStringFlag(flags: Flags, name: string): string | undefined {
  const value = flags.get(name);
  return typeof value === "string" ? value : undefined;
}

function getBooleanFlag(flags: Flags, name: string): boolean {
  return flags.get(name) === true;
}

function getLimit(flags: Flags): number {
  const raw = getStringFlag(flags, "limit");
  if (!raw) return 7;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    throw new Error("Invalid limit: expected integer in [1, 50]");
  }
  return parsed;
}

function parseTimeout(flags: Flags): number | undefined {
  const raw = getStringFlag(flags, "timeout-ms");
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error("Invalid timeout-ms");
  return parsed;
}

async function main(): Promise<void> {
  const { command, positionals, flags } = parseArgv(process.argv.slice(2));
  const network = normalizeNetwork(getStringFlag(flags, "network"));
  const raw = getBooleanFlag(flags, "raw");
  const timeoutMs = parseTimeout(flags);
  const pageSize = parsePageSize(getStringFlag(flags, "page-size"));
  const cursor = getStringFlag(flags, "cursor");
  const ctx = { command, network, raw, timeoutMs };

  let result: { data: unknown; pagination?: { next_cursor: string | null; has_next: boolean } };

  switch (command) {
    case "lookup-token":
      if (positionals.length < 1) usage();
      result = await lookupToken(ctx, positionals[0], getLimit(flags));
      break;
    case "get-contract-abi":
      if (positionals.length < 1) usage();
      result = await getContractAbi(ctx, assertAddress(positionals[0]));
      break;
    case "inspect-contract":
      if (positionals.length < 1) usage();
      result = await inspectContract(ctx, assertAddress(positionals[0]), getStringFlag(flags, "file"));
      break;
    case "get-address-info":
      if (positionals.length < 1) usage();
      result = await getAddressInfo(ctx, assertAddress(positionals[0]));
      break;
    case "get-tokens":
      if (positionals.length < 1) usage();
      result = await getTokens(ctx, assertAddress(positionals[0]), pageSize, cursor);
      break;
    case "get-nfts":
      if (positionals.length < 1) usage();
      result = await getNfts(ctx, assertAddress(positionals[0]), pageSize, cursor, getBooleanFlag(flags, "include-instances"));
      break;
    case "get-block-info":
      if (positionals.length < 1) usage();
      result = await getBlockInfo(ctx, assertBlockId(positionals[0]), getBooleanFlag(flags, "include-txs"));
      break;
    case "get-transaction":
      if (positionals.length < 1) usage();
      result = await getTransaction(ctx, assertTxHash(positionals[0]));
      break;
    case "get-transaction-logs":
      if (positionals.length < 1) usage();
      result = await getTransactionLogs(ctx, assertTxHash(positionals[0]), pageSize, cursor);
      break;
    case "get-address-logs":
      if (positionals.length < 1) usage();
      result = await getAddressLogs(ctx, assertAddress(positionals[0]), pageSize, cursor);
      break;
    case "get-transactions":
      if (positionals.length < 1) usage();
      result = await getTransactions(
        ctx,
        assertAddress(positionals[0]),
        assertIsoDateTime(getStringFlag(flags, "from") ?? "", "--from"),
        getStringFlag(flags, "to") ? assertIsoDateTime(getStringFlag(flags, "to") as string, "--to") : undefined,
        getStringFlag(flags, "methods"),
        pageSize,
        cursor,
      );
      break;
    case "get-token-transfers":
      if (positionals.length < 1) usage();
      result = await getTokenTransfers(
        ctx,
        assertAddress(positionals[0]),
        assertIsoDateTime(getStringFlag(flags, "from") ?? "", "--from"),
        getStringFlag(flags, "to") ? assertIsoDateTime(getStringFlag(flags, "to") as string, "--to") : undefined,
        getStringFlag(flags, "token") ? assertAddress(getStringFlag(flags, "token") as string) : undefined,
        pageSize,
        cursor,
      );
      break;
    default:
      usage();
  }

  printJson(success(command, network, result.data, result.pagination));
}

function mapErrorCode(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.status === 404) return "NOT_FOUND";
    if (error.status >= 400 && error.status < 500) return "UPSTREAM_4XX";
    if (error.status >= 500) return "UPSTREAM_5XX";
  }
  if (error instanceof Error) {
    if (/Invalid address/.test(error.message)) return "INVALID_ADDRESS";
    if (/Invalid transaction hash/.test(error.message)) return "INVALID_HASH";
    if (/Invalid block number or hash/.test(error.message)) return "INVALID_ARGUMENT";
    if (/ABI is not available|Source file not found/.test(error.message)) return "NOT_FOUND";
    if (/Invalid /.test(error.message)) return "INVALID_ARGUMENT";
    if (/timed out|abort/i.test(error.message)) return "TIMEOUT";
  }
  return "NETWORK_ERROR";
}

main().catch((error) => {
  const { command, flags } = parseArgv(process.argv.slice(2));
  let network = "mainnet";
  try {
    network = normalizeNetwork(getStringFlag(flags, "network"));
  } catch {}

  const details = error instanceof HttpError ? { status: error.status, body: error.body } : undefined;
  printJson(failure(command, network as "mainnet" | "devnet", mapErrorCode(error), error instanceof Error ? error.message : String(error), details));
  process.exitCode = 1;
});
