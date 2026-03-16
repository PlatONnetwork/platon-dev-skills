---
name: platon-blockscout
description: Query PlatON Blockscout explorer data for mainnet or devnet. Use when a user asks for explorer-style address, contract, ABI, token, NFT, block, or transaction information from Blockscout rather than direct RPC calls.
---

# PlatON Blockscout

## Overview

Use the bundled TypeScript script to query PlatON Blockscout on `mainnet` or `devnet`. This skill is for explorer data such as verified contract metadata, ABI, token holdings, NFT collections, block details, transaction details, and filtered history.

## When To Use

Use this skill when the user asks for:

- address overview from the explorer
- verified contract ABI or source metadata
- token or NFT holdings for an address
- block or transaction details from Blockscout
- transaction logs or address-emitted logs from Blockscout
- explorer-filtered transaction or token transfer history

Do not use this skill for:

- RPC endpoint discovery; use `$platon-chainlist`
- raw RPC reads or writes such as `eth_call`, `balance`, `logs`, `storage`, `send`; use `$platon-cli`

## Prerequisites

Require Node.js 24+ because the script relies on the built-in `fetch` API and direct execution of `.ts` files.

## Workflow

1. Choose `mainnet` or `devnet`. Default to `mainnet` unless the user clearly asks for devnet.
2. Run [`scripts/blockscout.ts`](./scripts/blockscout.ts) with the matching command.
3. Return JSON by default.
4. If the user wants a short human summary, summarize the JSON output after running the script.
5. If the needed data is not exposed by Blockscout, switch to `$platon-cli` or `$platon-chainlist`.

## Commands

Use these forms:

```bash
node platon-blockscout/scripts/blockscout.ts lookup-token USDT --network mainnet
node platon-blockscout/scripts/blockscout.ts get-contract-abi 0x... --network mainnet
node platon-blockscout/scripts/blockscout.ts inspect-contract 0x... --network mainnet
node platon-blockscout/scripts/blockscout.ts get-address-info 0x... --network mainnet
node platon-blockscout/scripts/blockscout.ts get-tokens 0x... --network mainnet
node platon-blockscout/scripts/blockscout.ts get-nfts 0x... --network mainnet
node platon-blockscout/scripts/blockscout.ts get-block-info 1000000 --network mainnet
node platon-blockscout/scripts/blockscout.ts get-transaction 0x... --network mainnet
node platon-blockscout/scripts/blockscout.ts get-transaction-logs 0x... --network mainnet
node platon-blockscout/scripts/blockscout.ts get-address-logs 0x... --network mainnet
node platon-blockscout/scripts/blockscout.ts get-transactions 0x... --from 2024-01-01T00:00:00Z --network mainnet
node platon-blockscout/scripts/blockscout.ts get-token-transfers 0x... --from 2024-01-01T00:00:00Z --network mainnet
```

## Common Examples

Use these examples to map common user intents to the right command:

- Get the ABI for a verified contract:

```bash
node platon-blockscout/scripts/blockscout.ts get-contract-abi 0xF4A07d980A56f67F6ea178c3918B21DCAE1b4E50 --network mainnet
```

- Inspect a verified contract and list its source files:

```bash
node platon-blockscout/scripts/blockscout.ts inspect-contract 0xF4A07d980A56f67F6ea178c3918B21DCAE1b4E50 --network mainnet
```

- Read one verified source file from a contract:

```bash
node platon-blockscout/scripts/blockscout.ts inspect-contract 0xF4A07d980A56f67F6ea178c3918B21DCAE1b4E50 --network mainnet --file src/interfaces/IPacketConsumerProxy.sol
```

- Get all logs emitted in a specific transaction:

```bash
node platon-blockscout/scripts/blockscout.ts get-transaction-logs 0xd7fafb0eb6ae081594d8fcafbce60c0888fbf54c526c6b81b21e8f3c67dc50a3 --network mainnet
```

- Get logs emitted by a token or contract address:

```bash
node platon-blockscout/scripts/blockscout.ts get-address-logs 0xeac734fb7581D8eB2CE4949B0896FC4E76769509 --network mainnet --page-size 20
```

- Query an address's transaction history for a time window:

```bash
node platon-blockscout/scripts/blockscout.ts get-transactions 0xDF66EC4Df18a770E82e999C68c2C0D737a5949Fc --from 2026-03-15T00:00:00Z --network mainnet
```

## Output

- Default format is JSON.
- All successful responses use a `data` envelope and include `meta`.
- Paginated responses may include `pagination.next_cursor` and `pagination.has_next`.
- All errors are emitted as structured JSON error objects.

## References

Read these only when needed:

- [references/api-surface.md](./references/api-surface.md)
- [references/blockscout-api-index.md](./references/blockscout-api-index.md)
- [references/output-contract.md](./references/output-contract.md)
- [references/endpoint-notes.md](./references/endpoint-notes.md)
