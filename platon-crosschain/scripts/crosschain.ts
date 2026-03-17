#!/usr/bin/env node

import { fileURLToPath } from "node:url";

export type Command =
  | "list-bridges"
  | "get-bridge-route"
  | "list-bridge-transactions"
  | "get-bridge-transaction"
  | "inspect-bridge-contract";

export type NetworkName = "mainnet" | "testnet";

export type ErrorEnvelope = {
  ok: false;
  command: string;
  network?: string;
  error: { code: string; message: string };
};

export type SuccessEnvelope = {
  ok: true;
  command: string;
  network?: string;
  data: Record<string, unknown>;
};

export type Envelope = ErrorEnvelope | SuccessEnvelope;

type RawChain = {
  id?: number;
  name?: string;
  rpcUrl?: string;
  wsUrl?: string;
  chainId?: number;
  currencySymbol?: string;
  scanUrl?: string;
  status?: number;
  icon?: string;
};

type RawContract = {
  id?: number;
  srcProxyContract?: string;
  srcSwitch?: number;
  targetProxyContract?: string;
  targetSwitch?: number;
  srcContract?: string;
  targetContract?: string;
};

type RawAsset = {
  id?: number;
  bridgeId?: number;
  sourceAddress?: string;
  sourceName?: string;
  sourceDecimals?: number;
  sourceTokenType?: number;
  sourceSymbol?: string;
  targetAddress?: string;
  targetName?: string;
  targetDecimals?: number;
  targetTokenType?: number;
  targetSymbol?: string;
  cap?: string | number;
  sourceSingleMinCap?: string | number;
  sourceSingleMaxCap?: string | number;
  targetSingleMinCap?: string | number;
  targetSingleMaxCap?: string | number;
  sourceLockFee?: string | number;
  targetRedeemFee?: string | number;
  sourceRollbackFee?: string | number;
  targetRollbackFee?: string | number;
  depositStatus?: number;
};

export type RawBridgeRoute = {
  id?: number;
  name?: string;
  bridgeCode?: string;
  status?: number;
  contract?: RawContract;
  srcChain?: RawChain;
  desChain?: RawChain;
  targetChain?: RawChain;
  assets?: RawAsset[];
};

type NormalizedChain = {
  id: number | null;
  name: string;
  chain_id: number | null;
  currency_symbol: string;
  status: number | null;
  rpc_url?: string;
  ws_url?: string;
  scan_url?: string;
};

type PublicChain = {
  id: number | null;
  name: string;
  chain_id: number | null;
  currency_symbol: string;
  status: number | null;
  scan_url?: string;
};

export type NormalizedAsset = {
  bridge_asset_id: number | null;
  source_symbol: string;
  target_symbol: string;
  source_name: string;
  target_name: string;
  source_address: string;
  target_address: string;
  source_decimals: number | null;
  target_decimals: number | null;
  source_token_type: number | null;
  target_token_type: number | null;
  source_token_type_label: string;
  target_token_type_label: string;
  deposit_status: number | null;
  caps: Record<string, string>;
  fees: Record<string, string>;
};

export type NormalizedRoute = {
  bridge_id: number | null;
  bridge_name: string;
  bridge_code: string;
  bridge_status: number | null;
  src_chain: NormalizedChain;
  dest_chain: NormalizedChain;
  src_proxy_contract: string;
  dest_proxy_contract: string;
  src_switch: number | null;
  dest_switch: number | null;
  src_contract?: string;
  dest_contract?: string;
  assets: NormalizedAsset[];
};

export type RawTransactionItem = {
  bridgeCode?: string;
  eventType?: number;
  eventHistoryId?: number | null;
  eventHistoryPendingId?: number | null;
  txHash?: string;
  scanUrl?: string;
  remoteTxHash?: string;
  remoteScanUrl?: string;
  symbol?: string;
  fromAddress?: string;
  fromValue?: string;
  toAddress?: string;
  toValue?: string;
  fromContractType?: string;
  fromContract?: string;
  toContractType?: string;
  toContract?: string;
  fee?: string;
  date?: string;
  decimals?: number;
  status?: string;
  rollbackStatus?: string;
  reason?: string;
  remotePendingTransactionId?: string;
  fromAddressType?: string;
  toAddressType?: string;
};

export type RawPage<T> = {
  total?: number;
  current?: number;
  size?: number;
  items?: T[];
};

const SUPPORTED_COMMANDS: Command[] = [
  "list-bridges",
  "get-bridge-route",
  "list-bridge-transactions",
  "get-bridge-transaction",
  "inspect-bridge-contract",
];

export const NETWORKS: Record<NetworkName, { portalBaseUrl: string; browserBaseUrl: string }> = {
  mainnet: {
    portalBaseUrl: "https://bridge.platon.network",
    browserBaseUrl: "https://bridgescan.platon.network",
  },
  testnet: {
    portalBaseUrl: "https://testbridge.platon.network",
    browserBaseUrl: "https://testbridgescan.platon.network",
  },
};

const STATUS_TO_CODE: Record<string, number> = {
  all: 0,
  "from-pending": 1,
  reviewing: 2,
  "to-pending": 3,
  success: 4,
  fail: 5,
};

function usage(): never {
  console.error(`Usage: node scripts/crosschain.ts <command> [options]

Commands:
  list-bridges --network <mainnet|testnet>
  get-bridge-route --network <mainnet|testnet> --from-chain <name> --to-chain <name> [--symbol <symbol>]
  list-bridge-transactions --network <mainnet|testnet> [--status <all|from-pending|reviewing|to-pending|success|fail>] [--page <n>] [--page-size <n>] [--keyword <text>]
  get-bridge-transaction --network <mainnet|testnet> --event-history-id <id> [--event-history-pending-id <id>]
  inspect-bridge-contract --network <mainnet|testnet> --from-chain <name> --to-chain <name> [--symbol <symbol>]
`);
  process.exit(1);
}

function printEnvelope(envelope: Envelope): void {
  console.log(JSON.stringify(envelope, null, 2));
}

function ok(command: string, network: string | undefined, data: Record<string, unknown>): SuccessEnvelope {
  return { ok: true, command, network, data };
}

function fail(command: string, network: string | undefined, code: string, message: string): never {
  printEnvelope({ ok: false, command, network, error: { code, message } });
  process.exit(1);
}

function parseFlag(argv: string[], flag: string): string | undefined {
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === flag) return argv[i + 1];
  }
  return undefined;
}

function parseRequiredFlag(argv: string[], flag: string, command: string, network?: string): string {
  const value = parseFlag(argv, flag);
  if (!value) fail(command, network, "INVALID_ARGUMENT", `Missing required flag ${flag}`);
  return value;
}

function parseOptionalInt(argv: string[], flag: string, defaultValue: number, command: string, network?: string): number {
  const raw = parseFlag(argv, flag);
  if (raw === undefined) return defaultValue;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    fail(command, network, "INVALID_ARGUMENT", `Invalid integer value for ${flag}: ${raw}`);
  }
  return parsed;
}

function parseOptionalNullableInt(argv: string[], flag: string, command: string, network?: string): number | null | undefined {
  const raw = parseFlag(argv, flag);
  if (raw === undefined) return undefined;
  if (raw === "null") return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    fail(command, network, "INVALID_ARGUMENT", `Invalid integer value for ${flag}: ${raw}`);
  }
  return parsed;
}

function parseNetwork(argv: string[], command: string): NetworkName {
  const raw = parseRequiredFlag(argv, "--network", command).trim().toLowerCase();
  if (raw !== "mainnet" && raw !== "testnet") {
    fail(command, raw, "UNSUPPORTED_NETWORK", `Unsupported network '${raw}'. Use mainnet or testnet.`);
  }
  return raw;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text) as T;
}

function sanitizeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringNumber(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function normalizeChain(raw: RawChain | undefined): NormalizedChain {
  return {
    id: asNumberOrNull(raw?.id),
    name: sanitizeString(raw?.name),
    chain_id: asNumberOrNull(raw?.chainId),
    currency_symbol: sanitizeString(raw?.currencySymbol),
    status: asNumberOrNull(raw?.status),
    rpc_url: sanitizeString(raw?.rpcUrl) || undefined,
    ws_url: sanitizeString(raw?.wsUrl) || undefined,
    scan_url: sanitizeString(raw?.scanUrl) || undefined,
  };
}

function tokenTypeLabel(value: number | null): string {
  if (value === 0) return "native";
  if (value === 1) return "erc20";
  return "unknown";
}

function normalizeAsset(raw: RawAsset): NormalizedAsset {
  const sourceTokenType = asNumberOrNull(raw.sourceTokenType);
  const targetTokenType = asNumberOrNull(raw.targetTokenType);
  return {
    bridge_asset_id: asNumberOrNull(raw.id),
    source_symbol: sanitizeString(raw.sourceSymbol),
    target_symbol: sanitizeString(raw.targetSymbol),
    source_name: sanitizeString(raw.sourceName),
    target_name: sanitizeString(raw.targetName),
    source_address: sanitizeString(raw.sourceAddress),
    target_address: sanitizeString(raw.targetAddress),
    source_decimals: asNumberOrNull(raw.sourceDecimals),
    target_decimals: asNumberOrNull(raw.targetDecimals),
    source_token_type: sourceTokenType,
    target_token_type: targetTokenType,
    source_token_type_label: tokenTypeLabel(sourceTokenType),
    target_token_type_label: tokenTypeLabel(targetTokenType),
    deposit_status: asNumberOrNull(raw.depositStatus),
    caps: {
      total_cap: asStringNumber(raw.cap),
      source_single_min_cap: asStringNumber(raw.sourceSingleMinCap),
      source_single_max_cap: asStringNumber(raw.sourceSingleMaxCap),
      target_single_min_cap: asStringNumber(raw.targetSingleMinCap),
      target_single_max_cap: asStringNumber(raw.targetSingleMaxCap),
    },
    fees: {
      source_lock_fee: asStringNumber(raw.sourceLockFee),
      target_redeem_fee: asStringNumber(raw.targetRedeemFee),
      source_rollback_fee: asStringNumber(raw.sourceRollbackFee),
      target_rollback_fee: asStringNumber(raw.targetRollbackFee),
    },
  };
}

export function normalizeRoute(raw: RawBridgeRoute): NormalizedRoute {
  const destRaw = raw.desChain ?? raw.targetChain;
  return {
    bridge_id: asNumberOrNull(raw.id),
    bridge_name: sanitizeString(raw.name),
    bridge_code: sanitizeString(raw.bridgeCode),
    bridge_status: asNumberOrNull(raw.status),
    src_chain: normalizeChain(raw.srcChain),
    dest_chain: normalizeChain(destRaw),
    src_proxy_contract: sanitizeString(raw.contract?.srcProxyContract),
    dest_proxy_contract: sanitizeString(raw.contract?.targetProxyContract),
    src_switch: asNumberOrNull(raw.contract?.srcSwitch),
    dest_switch: asNumberOrNull(raw.contract?.targetSwitch),
    src_contract: sanitizeString(raw.contract?.srcContract) || undefined,
    dest_contract: sanitizeString(raw.contract?.targetContract) || undefined,
    assets: (raw.assets ?? [])
      .filter((asset) => asNumberOrNull(asset.depositStatus) === 1)
      .map(normalizeAsset),
  };
}

function toPublicChain(chain: NormalizedChain): PublicChain {
  return {
    id: chain.id,
    name: chain.name,
    chain_id: chain.chain_id,
    currency_symbol: chain.currency_symbol,
    status: chain.status,
    scan_url: chain.scan_url,
  };
}

function compact(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function chainMatches(chain: NormalizedChain, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return [chain.name, chain.currency_symbol, String(chain.chain_id ?? "")]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(needle));
}

function assetMatches(asset: NormalizedAsset, symbol?: string): boolean {
  if (!symbol) return true;
  const needle = symbol.trim().toLowerCase();
  return (
    asset.source_symbol.toLowerCase() === needle ||
    asset.target_symbol.toLowerCase() === needle ||
    asset.source_name.toLowerCase().includes(needle) ||
    asset.target_name.toLowerCase().includes(needle)
  );
}

function pickRoute(routes: NormalizedRoute[], fromChain: string, toChain: string, symbol?: string): NormalizedRoute {
  const matches = routes.filter((route) => {
    if (!chainMatches(route.src_chain, fromChain)) return false;
    if (!chainMatches(route.dest_chain, toChain)) return false;
    if (symbol && !route.assets.some((asset) => assetMatches(asset, symbol))) return false;
    return true;
  });
  if (matches.length === 0) {
    throw new Error(`No active bridge route matched ${fromChain} -> ${toChain}${symbol ? ` for symbol ${symbol}` : ""}`);
  }
  return matches[0];
}

export function normalizeStatus(raw: string | undefined): string {
  switch (sanitizeString(raw)) {
    case "1":
      return "from-pending";
    case "2":
      return "reviewing";
    case "3":
      return "to-pending";
    case "4":
      return "success";
    case "5":
      return "fail";
    default:
      return sanitizeString(raw) || "unknown";
  }
}

export function normalizeEventType(raw: number | undefined): string {
  if (raw === 0) return "deposit";
  if (raw === 1) return "withdraw";
  return "unknown";
}

function tryParseJsonArray(value: string | undefined): string[] | undefined {
  const text = sanitizeString(value);
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text) as unknown;
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : undefined;
  } catch {
    return undefined;
  }
}

export function normalizeTransaction(
  item: RawTransactionItem,
  overrides?: { eventHistoryId?: number | null; eventHistoryPendingId?: number | null },
): Record<string, unknown> {
  return {
    bridge_code: sanitizeString(item.bridgeCode),
    event_type: normalizeEventType(item.eventType),
    event_history_id: overrides?.eventHistoryId ?? item.eventHistoryId ?? null,
    event_history_pending_id: overrides?.eventHistoryPendingId ?? item.eventHistoryPendingId ?? null,
    tx_hash: compact(sanitizeString(item.txHash)) ?? null,
    remote_tx_hash: compact(sanitizeString(item.remoteTxHash)) ?? null,
    source_chain: sanitizeString(item.fromContractType || item.fromAddressType),
    destination_chain: sanitizeString(item.toContractType || item.toAddressType),
    symbol: sanitizeString(item.symbol),
    decimals: asNumberOrNull(item.decimals),
    status: normalizeStatus(item.status),
    raw_status: sanitizeString(item.status),
    rollback_status: sanitizeString(item.rollbackStatus),
    from_address: sanitizeString(item.fromAddress),
    to_address: sanitizeString(item.toAddress),
    from_contract: sanitizeString(item.fromContract),
    to_contract: sanitizeString(item.toContract),
    from_value: sanitizeString(item.fromValue),
    to_value: sanitizeString(item.toValue),
    fee: sanitizeString(item.fee),
    reason: compact(sanitizeString(item.reason)) ?? null,
    date: sanitizeString(item.date),
    scan_url: compact(sanitizeString(item.scanUrl)) ?? null,
    remote_scan_url: compact(sanitizeString(item.remoteScanUrl)) ?? null,
    remote_pending_transaction_ids: tryParseJsonArray(item.remotePendingTransactionId) ?? [],
  };
}

async function loadRoutes(network: NetworkName): Promise<NormalizedRoute[]> {
  const url = `${NETWORKS[network].portalBaseUrl}/portal-api/bridge/defaults`;
  const response = await fetchJson<{ code?: number; msg?: string; data?: RawBridgeRoute[] }>(url);
  if (response.code !== 10000 || !Array.isArray(response.data)) {
    throw new Error(`Unexpected bridge defaults response: code=${String(response.code)} msg=${sanitizeString(response.msg)}`);
  }
  return response.data.map(normalizeRoute);
}

async function listTransactions(network: NetworkName, pageNum: number, pageSize: number, status: number, keyWord: string): Promise<RawPage<RawTransactionItem>> {
  const url = `${NETWORKS[network].browserBaseUrl}/browser-api/transaction/list`;
  const response = await fetchJson<{ code?: number; msg?: string; data?: RawPage<RawTransactionItem> }>(url, {
    method: "POST",
    body: JSON.stringify({ pageNum, pageSize, status, keyWord }),
  });
  if (response.code !== 10000 || !response.data) {
    throw new Error(`Unexpected transaction list response: code=${String(response.code)} msg=${sanitizeString(response.msg)}`);
  }
  return response.data;
}

async function getTransactionDetail(network: NetworkName, eventHistoryId: number, eventHistoryPendingId: number | null): Promise<RawTransactionItem> {
  const url = `${NETWORKS[network].browserBaseUrl}/browser-api/transaction/details`;
  const response = await fetchJson<{ code?: number; msg?: string; data?: RawTransactionItem }>(url, {
    method: "POST",
    body: JSON.stringify({ eventHistoryId, eventHistoryPendingId }),
  });
  if (response.code !== 10000 || !response.data) {
    throw new Error(`Unexpected transaction detail response: code=${String(response.code)} msg=${sanitizeString(response.msg)}`);
  }
  return response.data;
}

export function routeSummary(route: NormalizedRoute, symbol?: string): Record<string, unknown> {
  const assets = symbol ? route.assets.filter((asset) => assetMatches(asset, symbol)) : route.assets;
  return {
    ...route,
    src_chain: toPublicChain(route.src_chain),
    dest_chain: toPublicChain(route.dest_chain),
    assets,
    chainlist_lookup_hint: {
      source: route.src_chain.name,
      destination: route.dest_chain.name,
    },
  };
}

export function buildInspectData(route: NormalizedRoute, symbol?: string): Record<string, unknown> {
  const asset = symbol ? route.assets.find((item) => assetMatches(item, symbol)) : route.assets[0];
  const routeInfo = routeSummary(route, symbol);
  return {
    route: routeInfo,
    selected_asset: asset ?? null,
    rpc_lookup_hint: {
      source_chainlist_query: route.src_chain.name,
      destination_chainlist_query: route.dest_chain.name,
      note: "Use platon-chainlist to resolve the actual RPC URL before running cast.",
    },
    contract_roles: {
      source: {
        contract_family: "Source",
        proxy_contract: route.src_proxy_contract,
        switch_status: route.src_switch,
        implementation_hint: route.src_contract ?? null,
      },
      target: {
        contract_family: "Target",
        proxy_contract: route.dest_proxy_contract,
        switch_status: route.dest_switch,
        implementation_hint: route.dest_contract ?? null,
      },
    },
    cast_call_examples: {
      source: [
        `cast call ${route.src_proxy_contract} "nativeSymbol()" --rpc-url <SOURCE_RPC_URL>`,
        `cast call ${route.src_proxy_contract} "getTokenContract(string)" "${asset?.source_symbol ?? "<SYMBOL>"}" --rpc-url <SOURCE_RPC_URL>`,
        `cast call ${route.src_proxy_contract} "getSingleMinCap(string)" "${asset?.source_symbol ?? "<SYMBOL>"}" --rpc-url <SOURCE_RPC_URL>`,
        `cast call ${route.src_proxy_contract} "getSingleMaxCap(string)" "${asset?.source_symbol ?? "<SYMBOL>"}" --rpc-url <SOURCE_RPC_URL>`,
        `cast call ${route.src_proxy_contract} "getTokenAcrossFee(string)" "${asset?.source_symbol ?? "<SYMBOL>"}" --rpc-url <SOURCE_RPC_URL>`,
      ],
      target: [
        `cast call ${route.dest_proxy_contract} "getTokenContract(string)" "${asset?.target_symbol ?? "<SYMBOL>"}" --rpc-url <DESTINATION_RPC_URL>`,
        `cast call ${route.dest_proxy_contract} "getSingleMinCap(string)" "${asset?.target_symbol ?? "<SYMBOL>"}" --rpc-url <DESTINATION_RPC_URL>`,
        `cast call ${route.dest_proxy_contract} "getSingleMaxCap(string)" "${asset?.target_symbol ?? "<SYMBOL>"}" --rpc-url <DESTINATION_RPC_URL>`,
        `cast call ${route.dest_proxy_contract} "getTokenFee(string)" "${asset?.target_symbol ?? "<SYMBOL>"}" --rpc-url <DESTINATION_RPC_URL>`,
        `cast call ${route.dest_proxy_contract} "getTokenInfo(string)" "${asset?.target_symbol ?? "<SYMBOL>"}" --rpc-url <DESTINATION_RPC_URL>`,
      ],
    },
    write_guidance: {
      lock_asset: {
        method: "lockAsset(address,string,uint256)",
        note: "Address-based EVM receiver only in v1. Build calldata, sign externally, then broadcast the signed raw transaction.",
        example_calldata: `cast calldata "lockAsset(address,string,uint256)" <RECEIVER> "${asset?.source_symbol ?? "<SYMBOL>"}" <AMOUNT_IN_WEI>`,
      },
      redeem_token: {
        method: "redeemToken(address,string,uint256)",
        note: "Address-based EVM receiver only in v1. Build calldata, sign externally, then broadcast the signed raw transaction.",
        example_calldata: `cast calldata "redeemToken(address,string,uint256)" <RECEIVER> "${asset?.target_symbol ?? "<SYMBOL>"}" <AMOUNT_IN_WEI>`,
      },
      broadcast_after_external_signing: "cast publish <SIGNED_RAW_TX> --rpc-url <RPC_URL>",
    },
  };
}

export async function run(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") usage();
  if (!SUPPORTED_COMMANDS.includes(command as Command)) usage();

  const network = parseNetwork(rest, command);

  try {
    if (command === "list-bridges") {
      const routes = await loadRoutes(network);
      printEnvelope(
        ok(command, network, {
          count: routes.length,
          routes: routes.map((route) => routeSummary(route)),
        }),
      );
      return;
    }

    if (command === "get-bridge-route") {
      const fromChain = parseRequiredFlag(rest, "--from-chain", command, network);
      const toChain = parseRequiredFlag(rest, "--to-chain", command, network);
      const symbol = compact(parseFlag(rest, "--symbol") ?? "");
      const routes = await loadRoutes(network);
      const route = pickRoute(routes, fromChain, toChain, symbol);
      printEnvelope(ok(command, network, routeSummary(route, symbol)));
      return;
    }

    if (command === "list-bridge-transactions") {
      const page = parseOptionalInt(rest, "--page", 1, command, network);
      const pageSize = parseOptionalInt(rest, "--page-size", 20, command, network);
      const statusText = (parseFlag(rest, "--status") ?? "all").trim().toLowerCase();
      const status = STATUS_TO_CODE[statusText];
      if (status === undefined) {
        fail(command, network, "INVALID_ARGUMENT", `Unsupported status '${statusText}'`);
      }
      const keyword = parseFlag(rest, "--keyword") ?? "";
      const pageData = await listTransactions(network, page, pageSize, status, keyword);
      printEnvelope(
        ok(command, network, {
          pagination: {
            page: pageData.current ?? page,
            page_size: pageData.size ?? pageSize,
            total: pageData.total ?? 0,
          },
          items: (pageData.items ?? []).map(normalizeTransaction),
        }),
      );
      return;
    }

    if (command === "get-bridge-transaction") {
      const eventHistoryId = parseOptionalInt(rest, "--event-history-id", -1, command, network);
      if (eventHistoryId === -1) {
        fail(command, network, "INVALID_ARGUMENT", "Missing required flag --event-history-id");
      }
      const eventHistoryPendingId = parseOptionalNullableInt(rest, "--event-history-pending-id", command, network) ?? null;
      const detail = await getTransactionDetail(network, eventHistoryId, eventHistoryPendingId);
      printEnvelope(
        ok(command, network, {
          transaction: normalizeTransaction(detail, {
            eventHistoryId,
            eventHistoryPendingId,
          }),
        }),
      );
      return;
    }

    if (command === "inspect-bridge-contract") {
      const fromChain = parseRequiredFlag(rest, "--from-chain", command, network);
      const toChain = parseRequiredFlag(rest, "--to-chain", command, network);
      const symbol = compact(parseFlag(rest, "--symbol") ?? "");
      const routes = await loadRoutes(network);
      const route = pickRoute(routes, fromChain, toChain, symbol);
      printEnvelope(ok(command, network, buildInspectData(route, symbol)));
      return;
    }
  } catch (error) {
    fail(command, network, "UPSTREAM_ERROR", error instanceof Error ? error.message : String(error));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  run().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    printEnvelope({
      ok: false,
      command: process.argv[2] ?? "unknown",
      network: undefined,
      error: { code: "UPSTREAM_ERROR", message },
    });
    process.exit(1);
  });
}
