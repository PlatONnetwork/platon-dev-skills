#!/usr/bin/env node

const { execFileSync } = require("node:child_process");

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type ChainEntry = {
  name?: string;
  title?: string;
  chain?: string;
  network?: string;
  shortName?: string;
  chainId?: number | string;
  rpc?: Array<string | { url?: string; [key: string]: JsonValue }>;
  explorers?: Array<string | { name?: string; url?: string; standard?: string }>;
  faucets?: string[];
  infoURL?: string;
  nativeCurrency?: { name?: string; symbol?: string; decimals?: number };
  icon?: string;
};

type UrlCheck = {
  url: string;
  valid: boolean;
  status?: number;
  name?: string;
  standard?: string;
  error?: string;
};

declare const WebSocket: {
  new (url: string): {
    onopen: (() => void) | null;
    onerror: ((event: unknown) => void) | null;
    onmessage: ((event: { data: string }) => void) | null;
    onclose: (() => void) | null;
    send(data: string): void;
    close(): void;
  };
};

const DEFAULT_CHAINLIST_URL = "https://chainlist.org/rpcs.json";
const DEFAULT_CHAIN_KEYWORD = "platon";
const REQUEST_TIMEOUT = 10_000;
const BLOCK_NUMBER_TO_CHECK = "latest";
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const DEV_ALIASES = new Set(["dev", "testnet", "devnet"]);
const MAINNET_ALIASES = new Set(["mainnet", "main"]);

function usage(): never {
  console.error("Usage: node scripts/lookup_chain.ts <dev|testnet|devnet|mainnet|main> [info]");
  process.exit(1);
}

function normalizeNetwork(raw?: string): "dev" | "mainnet" {
  const value = (raw ?? "").trim().toLowerCase();
  if (DEV_ALIASES.has(value)) return "dev";
  if (MAINNET_ALIASES.has(value)) return "mainnet";
  usage();
}

function toChainId(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : -1;
  }
  return -1;
}

function collectText(entry: ChainEntry): string {
  return [
    entry.name ?? "",
    entry.title ?? "",
    entry.chain ?? "",
    entry.network ?? "",
    entry.shortName ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function isTargetChain(entry: ChainEntry, keyword: string): boolean {
  return JSON.stringify(entry).toLowerCase().includes(keyword.toLowerCase());
}

function classifyNetwork(entry: ChainEntry): "dev" | "mainnet" {
  const text = collectText(entry);
  for (const alias of DEV_ALIASES) {
    if (text.includes(alias)) return "dev";
  }
  for (const alias of MAINNET_ALIASES) {
    if (text.includes(alias)) return "mainnet";
  }
  return "mainnet";
}

function rankEntry(entry: ChainEntry, network: "dev" | "mainnet"): [number, number, number, number] {
  const text = collectText(entry);
  const hasChainName = text.includes("platon") ? 1 : 0;
  const hasRpc = (entry.rpc?.length ?? 0) > 0 ? 1 : 0;
  const hasExplorer = (entry.explorers?.length ?? 0) > 0 ? 1 : 0;
  const chainIdRank = network === "dev" ? toChainId(entry.chainId) : 0;
  return [hasChainName, hasRpc, hasExplorer, chainIdRank];
}

function chooseEntry(chainlist: ChainEntry[], network: "dev" | "mainnet"): ChainEntry {
  const candidates = chainlist.filter((entry) => isTargetChain(entry, DEFAULT_CHAIN_KEYWORD));
  if (candidates.length === 0) {
    throw new Error(`No chainlist entries matched chain keyword '${DEFAULT_CHAIN_KEYWORD}'`);
  }

  const exactNetwork = candidates.filter((entry) => classifyNetwork(entry) === network);
  const pool = exactNetwork.length > 0 ? exactNetwork : candidates;
  return [...pool].sort((a, b) => {
    const left = rankEntry(a, network);
    const right = rankEntry(b, network);
    for (let i = 0; i < left.length; i += 1) {
      if (left[i] !== right[i]) return right[i] - left[i];
    }
    return 0;
  })[0];
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        ...(init?.headers ?? {}),
      },
    });
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadChainlist(): Promise<ChainEntry[]> {
  const raw = execFileSync(
    "curl",
    ["-sS", "-H", `User-Agent: ${USER_AGENT}`, DEFAULT_CHAINLIST_URL],
    { encoding: "utf-8", maxBuffer: 16 * 1024 * 1024 },
  );
  const data = JSON.parse(raw) as unknown;
  if (!Array.isArray(data)) throw new Error("Expected the chainlist source to be a JSON array");
  return data as ChainEntry[];
}

async function checkHttpUrl(url: string): Promise<UrlCheck> {
  if (!url) return { url, valid: false, error: "empty url" };

  const headController = new AbortController();
  const headTimeout = setTimeout(() => headController.abort(), REQUEST_TIMEOUT);
  try {
    const headResponse = await fetch(url, {
      method: "HEAD",
      signal: headController.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    return { url, valid: headResponse.status >= 200 && headResponse.status < 400, status: headResponse.status };
  } catch (error) {
    clearTimeout(headTimeout);
    const getController = new AbortController();
    const getTimeout = setTimeout(() => getController.abort(), REQUEST_TIMEOUT);
    try {
      const getResponse = await fetch(url, {
        method: "GET",
        signal: getController.signal,
        headers: { "User-Agent": USER_AGENT },
      });
      return { url, valid: getResponse.status >= 200 && getResponse.status < 400, status: getResponse.status };
    } catch (innerError) {
      return { url, valid: false, error: innerError instanceof Error ? innerError.message : String(innerError ?? error) };
    } finally {
      clearTimeout(getTimeout);
    }
  } finally {
    clearTimeout(headTimeout);
  }
}

async function checkRpcHttpUrl(url: string): Promise<UrlCheck> {
  if (!url) return { url, valid: false, error: "empty url" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify({
        method: "eth_getBlockByNumber",
        params: [BLOCK_NUMBER_TO_CHECK, false],
        id: 1,
        jsonrpc: "2.0",
      }),
    });
    const body = (await response.json()) as { result?: { number?: string }; error?: unknown };
    const valid = response.status >= 200 && response.status < 400 && Boolean(body.result?.number);
    return {
      url,
      valid,
      status: response.status,
      error: valid ? undefined : body.error ? JSON.stringify(body.error) : undefined,
    };
  } catch (error) {
    return { url, valid: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkRpcWsUrl(url: string): Promise<UrlCheck> {
  if (!url) return { url, valid: false, error: "empty url" };

  return await new Promise<UrlCheck>((resolve) => {
    const timer = setTimeout(() => {
      resolve({ url, valid: false, error: "WebSocket timeout" });
    }, REQUEST_TIMEOUT);

    let settled = false;
    const ws = new WebSocket(url);

    const finish = (result: UrlCheck): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {}
      resolve(result);
    };

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          method: "eth_getBlockByNumber",
          params: [BLOCK_NUMBER_TO_CHECK, false],
          id: 1,
          jsonrpc: "2.0",
        }),
      );
    };

    ws.onerror = (event) => {
      const message =
        event instanceof ErrorEvent && event.error instanceof Error
          ? event.error.message
          : "WebSocket error";
      finish({ url, valid: false, error: message });
    };

    ws.onmessage = (event) => {
      try {
        const body = JSON.parse(event.data) as { result?: { number?: string }; error?: unknown };
        const valid = Boolean(body.result?.number);
        finish({
          url,
          valid,
          status: 101,
          error: valid ? undefined : body.error ? JSON.stringify(body.error) : undefined,
        });
      } catch (error) {
        finish({ url, valid: false, error: error instanceof Error ? error.message : String(error) });
      }
    };

    ws.onclose = () => {
      finish({ url, valid: false, error: "WebSocket closed before response" });
    };
  });
}

async function checkRpcUrl(url: string): Promise<UrlCheck> {
  const protocol = new URL(url).protocol.toLowerCase();
  if (protocol === "ws:" || protocol === "wss:") {
    return await checkRpcWsUrl(url);
  }
  return await checkRpcHttpUrl(url);
}

function formatCheckedUrl(item: UrlCheck): string {
  const parts: string[] = [item.valid ? "valid" : "invalid"];
  if (item.status !== undefined) parts.push(`status=${item.status}`);
  if (item.name) parts.push(`name=${item.name}`);
  if (item.error) parts.push(`error=${item.error}`);
  return `- ${item.url} [${parts.join(", ")}]`;
}

async function validateEntry(entry: ChainEntry): Promise<{
  rpc: UrlCheck[];
  explorers: UrlCheck[];
  faucets: UrlCheck[];
  infoURL?: UrlCheck;
}> {
  const rpcChecks = await Promise.all(
    (entry.rpc ?? []).map(async (item) => {
      if (typeof item === "string") return await checkRpcUrl(item);
      return await checkRpcUrl(item.url ?? "");
    }),
  );

  const explorerChecks = await Promise.all(
    (entry.explorers ?? []).map(async (item) => {
      if (typeof item === "string") return await checkHttpUrl(item);
      const checked = await checkHttpUrl(item.url ?? "");
      checked.name = item.name;
      checked.standard = item.standard;
      return checked;
    }),
  );

  const faucetChecks = await Promise.all((entry.faucets ?? []).map((url) => checkHttpUrl(url)));
  const infoCheck = entry.infoURL ? await checkHttpUrl(entry.infoURL) : undefined;

  return { rpc: rpcChecks, explorers: explorerChecks, faucets: faucetChecks, infoURL: infoCheck };
}

async function main(): Promise<void> {
  const network = normalizeNetwork(process.argv[2]);
  const command = (process.argv[3] ?? "info").trim().toLowerCase();
  if (command !== "info") {
    console.error("Only the 'info' command is supported.");
    process.exit(1);
  }

  const chainlist = await loadChainlist();
  const entry = chooseEntry(chainlist, network);
  const checks = await validateEntry(entry);

  const lines = [
    `Network: ${network}`,
    `Name: ${entry.name ?? entry.title ?? entry.chain ?? ""}`,
    `Chain: ${entry.chain ?? ""}`,
    `Chain ID: ${toChainId(entry.chainId)}`,
  ];

  if (entry.nativeCurrency) {
    lines.push(`Native Currency: ${entry.nativeCurrency.name ?? ""} (${entry.nativeCurrency.symbol ?? ""})`);
  }

  lines.push("RPC URLs:");
  lines.push(...(checks.rpc.length > 0 ? checks.rpc.map(formatCheckedUrl) : ["None"]));

  lines.push("Explorer URLs:");
  lines.push(...(checks.explorers.length > 0 ? checks.explorers.map(formatCheckedUrl) : ["None"]));

  lines.push("Faucet URLs:");
  lines.push(...(checks.faucets.length > 0 ? checks.faucets.map(formatCheckedUrl) : ["None"]));

  if (checks.infoURL) {
    lines.push(`Info URL: ${checks.infoURL.url} [${checks.infoURL.valid ? "valid" : "invalid"}${checks.infoURL.status !== undefined ? `, status=${checks.infoURL.status}` : ""}${checks.infoURL.error ? `, error=${checks.infoURL.error}` : ""}]`);
  }

  console.log(lines.join("\n"));
}

main().catch((error: unknown) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
