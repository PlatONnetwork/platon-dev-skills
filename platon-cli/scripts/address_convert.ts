#!/usr/bin/env node

const { execFileSync } = require("node:child_process");

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const HRP = "lat";

function usage(): never {
  process.stderr.write("Usage: node platon-cli/scripts/address_convert.ts <0x-address|lat-address>\n");
  process.exit(1);
}

function polymod(values: number[]): number {
  const generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const value of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < generators.length; i += 1) {
      if ((top >> i) & 1) chk ^= generators[i];
    }
  }
  return chk;
}

function hrpExpand(hrp: string): number[] {
  const result: number[] = [];
  for (let i = 0; i < hrp.length; i += 1) result.push(hrp.charCodeAt(i) >> 5);
  result.push(0);
  for (let i = 0; i < hrp.length; i += 1) result.push(hrp.charCodeAt(i) & 31);
  return result;
}

function createChecksum(hrp: string, data: number[]): number[] {
  const values = [...hrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0];
  const mod = polymod(values) ^ 1;
  const checksum: number[] = [];
  for (let p = 0; p < 6; p += 1) checksum.push((mod >> (5 * (5 - p))) & 31);
  return checksum;
}

function verifyChecksum(hrp: string, data: number[]): boolean {
  return polymod([...hrpExpand(hrp), ...data]) === 1;
}

function convertBits(data: number[], fromBits: number, toBits: number, pad: boolean): number[] {
  let acc = 0;
  let bits = 0;
  const result: number[] = [];
  const maxv = (1 << toBits) - 1;
  for (const value of data) {
    if (value < 0 || value >> fromBits !== 0) throw new Error("Invalid bit group");
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      result.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) result.push((acc << (toBits - bits)) & maxv);
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv) !== 0) {
    throw new Error("Invalid padding");
  }
  return result;
}

function decodeBech32(address: string): { hrp: string; data: number[] } {
  const normalized = address.trim();
  const hasMixedCase = normalized !== normalized.toLowerCase() && normalized !== normalized.toUpperCase();
  if (hasMixedCase) throw new Error("Bech32 address must not mix upper and lower case");
  const value = normalized.toLowerCase();
  const pos = value.lastIndexOf("1");
  if (pos < 1 || pos + 7 > value.length) throw new Error("Invalid bech32 address");
  const hrp = value.slice(0, pos);
  const dataPart = value.slice(pos + 1);
  const data = [...dataPart].map((char) => {
    const index = CHARSET.indexOf(char);
    if (index === -1) throw new Error(`Invalid bech32 character: ${char}`);
    return index;
  });
  if (!verifyChecksum(hrp, data)) throw new Error("Invalid bech32 checksum");
  return { hrp, data: data.slice(0, -6) };
}

function encodeBech32(hrp: string, data: number[]): string {
  const checksum = createChecksum(hrp, data);
  return `${hrp}1${[...data, ...checksum].map((value) => CHARSET[value]).join("")}`;
}

function assertHexAddress(value: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error(`Invalid 0x address: ${value}`);
  return value;
}

function hexToBytes(value: string): number[] {
  const normalized = assertHexAddress(value).slice(2);
  const result: number[] = [];
  for (let i = 0; i < normalized.length; i += 2) {
    result.push(Number.parseInt(normalized.slice(i, i + 2), 16));
  }
  return result;
}

function bytesToHex(bytes: number[]): string {
  return `0x${bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function toChecksumAddress(value: string): string {
  return execFileSync("cast", ["to-check-sum-address", value], {
    encoding: "utf8",
  }).trim();
}

function convertHexToBech32(address: string): string {
  const words = convertBits(hexToBytes(address), 8, 5, true);
  return encodeBech32(HRP, words);
}

function convertBech32ToHex(address: string): string {
  const { hrp, data } = decodeBech32(address);
  if (hrp !== HRP) throw new Error(`Invalid bech32 prefix: expected '${HRP}', got '${hrp}'`);
  const bytes = convertBits(data, 5, 8, false);
  if (bytes.length !== 20) throw new Error(`Invalid decoded address length: expected 20 bytes, got ${bytes.length}`);
  return toChecksumAddress(bytesToHex(bytes));
}

function main(): void {
  const input = process.argv[2];
  if (!input) usage();

  if (input.startsWith("0x") || input.startsWith("0X")) {
    process.stdout.write(`${convertHexToBech32(input)}\n`);
    return;
  }

  if (/^lat1/i.test(input)) {
    process.stdout.write(`${convertBech32ToHex(input)}\n`);
    return;
  }

  throw new Error("Unsupported address format. Expected 0x-prefixed hex or lat-prefixed bech32.");
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
