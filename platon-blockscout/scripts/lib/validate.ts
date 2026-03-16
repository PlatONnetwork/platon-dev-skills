import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./config.ts";

export function isHex(value: string, expectedBytes?: number): boolean {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) return false;
  if (expectedBytes == null) return true;
  return value.length === 2 + expectedBytes * 2;
}

export function assertAddress(value: string): string {
  if (!isHex(value, 20)) throw new Error(`Invalid address: ${value}`);
  return value;
}

export function assertTxHash(value: string): string {
  if (!isHex(value, 32)) throw new Error(`Invalid transaction hash: ${value}`);
  return value;
}

export function assertBlockId(value: string): string {
  if (/^\d+$/.test(value)) return value;
  if (isHex(value, 32)) return value;
  throw new Error(`Invalid block number or hash: ${value}`);
}

export function assertIsoDateTime(value: string, flagName: string): string {
  if (!value || Number.isNaN(Date.parse(value))) {
    throw new Error(`Invalid ${flagName}: expected ISO 8601 datetime`);
  }
  return value;
}

export function parsePageSize(value?: string): number {
  if (value == null) return DEFAULT_PAGE_SIZE;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_PAGE_SIZE) {
    throw new Error(`Invalid page size: expected integer in [1, ${MAX_PAGE_SIZE}]`);
  }
  return parsed;
}
