import type { NetworkName } from "./config.ts";

export type SuccessEnvelope = {
  data: unknown;
  pagination?: {
    next_cursor: string | null;
    has_next: boolean;
  };
  meta: {
    command: string;
    network: NetworkName;
    source: "blockscout";
    timestamp: string;
  };
};

export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    command: string;
    network: NetworkName;
    source: "blockscout";
  };
};

export function success(command: string, network: NetworkName, data: unknown, pagination?: SuccessEnvelope["pagination"]): SuccessEnvelope {
  return {
    data,
    ...(pagination ? { pagination } : {}),
    meta: {
      command,
      network,
      source: "blockscout",
      timestamp: new Date().toISOString(),
    },
  };
}

export function failure(command: string, network: NetworkName, code: string, message: string, details?: unknown): ErrorEnvelope {
  return {
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
    meta: {
      command,
      network,
      source: "blockscout",
    },
  };
}

export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
