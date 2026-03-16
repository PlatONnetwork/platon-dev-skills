export type NetworkName = "mainnet" | "devnet";

export const NETWORKS: Record<NetworkName, { baseUrl: string }> = {
  mainnet: { baseUrl: "https://blockscout.platon.network" },
  devnet: { baseUrl: "https://devnet3blockscout.platon.network" },
};

export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export function normalizeNetwork(value?: string): NetworkName {
  const normalized = (value ?? "mainnet").trim().toLowerCase();
  if (normalized === "main" || normalized === "mainnet") return "mainnet";
  if (normalized === "dev" || normalized === "devnet" || normalized === "testnet") return "devnet";
  throw new Error(`Unsupported network '${value ?? ""}'`);
}
