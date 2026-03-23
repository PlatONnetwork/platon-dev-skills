---
name: platon-chainlist
description: Query Chainlist data and return a validated summary for a requested chain and network such as PlatON, Avalanche, or Ethereum. Use when a user asks for inputs like `dev info`, `mainnet info`, `avalanche test`, `ethereum mainnet`, or similar chain-plus-network endpoint lookups.
---

# Chainlist Query

## Overview

Query `https://chainlist.org/rpcs.json` for the requested chain and network, then format the result for the user. Use the bundled TypeScript script for deterministic parsing instead of manually scanning the JSON.

## Prerequisites

Require Node.js 24+ because the script uses the built-in `fetch` and `WebSocket` APIs.

## Workflow

1. Run [`scripts/lookup_chain.ts`](./scripts/lookup_chain.ts) with the user's query text.
2. Let the script fetch Chainlist directly unless the task provides a local JSON file.
3. Return the summary view for the requested chain and network.

## Commands

Use these forms:

```bash
node scripts/lookup_chain.ts dev info
node scripts/lookup_chain.ts testnet info
node scripts/lookup_chain.ts mainnet info
node scripts/lookup_chain.ts main info
node scripts/lookup_chain.ts avalanche test
node scripts/lookup_chain.ts avalanche test --chainid 43113
node scripts/lookup_chain.ts avalanche mainnet
node scripts/lookup_chain.ts ethereum mainnet
node scripts/lookup_chain.ts platon dev --chainid 20250407
```

Supported network aliases:

- `dev`, `test`, `testnet`, `devnet`
- `mainnet`, `main`

Optional filters:

- `--chainid <id>`: require the selected Chainlist entry to match the exact chain ID

## Default Chain Info

Official site:

- `https://www.platon.network`

Mainnet defaults:

- Explorer: `https://scan.platon.network/`
- Explorer: `https://blockscout.platon.network/`
- HTTP RPC: `https://openapi2.platon.network/rpc`
- WebSocket RPC: `wss://openapi2.platon.network/ws`
- Chain ID: `210425 (0x335f9)`

Devnet defaults:

- Explorer: `https://devnet3scan.platon.network/`
- Explorer: `https://devnet3blockscout.platon.network/`
- HTTP RPC: `https://devnet3openapi.platon.network/rpc`
- WebSocket RPC: `wss://devnet3openapi.platon.network/ws`
- Chain ID: `20250407 (0x134ff27)`

Faucet:

- Devnet faucet: `https://devnet3faucet.platon.network/faucet`

## Notes

Only the `info` command is supported.

If no chain name is provided, default to `platon`.

If `--chainid` is provided, it is an additional exact-match filter after chain name and network selection.

Validate HTTP RPC endpoints by calling `eth_getBlockByNumber`. Validate `ws` / `wss` RPC endpoints with a WebSocket JSON-RPC request using the same method.

If multiple test/dev entries exist for the same chain, prefer the best-ranked entry for the requested network and then the largest `chainId`.

If the user needs machine-readable output, use `--format json`.
