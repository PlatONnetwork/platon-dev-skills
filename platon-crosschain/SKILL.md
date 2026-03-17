---
name: platon-crosschain
description: Query PlatON bridge routes and crosschain transaction data, and explain how to inspect or prepare bridge contract calls with cast for EVM chains. Use when the user asks about PlatON bridge assets, supported routes, bridge transaction status, lockAsset, redeemToken, or bridge contract read methods.
---

# PlatON Crosschain

## Overview

Use this skill for PlatON bridge route discovery, crosschain transaction lookup, and contract-oriented bridge guidance.

This skill is the right entrypoint when the user needs:

- supported bridge routes or assets
- source and destination proxy contract addresses
- bridge transaction list or transaction detail lookup
- guidance for `cast call` on bridge contracts
- guidance for preparing `lockAsset` or `redeemToken` transactions

Use other skills only for adjacent tasks:

- `platon-chainlist`: resolve validated RPC and explorer endpoints for the source or destination chain
- `platon-blockscout`: inspect PlatON explorer-indexed data such as verified contracts, holdings, transactions, and logs
- `platon-cli`: PlatON-only `cast` and RPC reference, not the canonical crosschain skill

## Scope

`platon-crosschain` covers:

- bridge route and asset discovery from `/portal-api/bridge/defaults`
- bridge transaction list and detail lookup from browser APIs
- bridge contract inspection guidance for `Source` and `Target`
- `cast call` examples for read-only methods
- `lockAsset` / `redeemToken` transaction preparation guidance
- external-signing and post-signature broadcast guidance


## Commands

Script entrypoint:

```bash
node platon-crosschain/scripts/crosschain.ts <command> [options]
```

Supported commands:

- `list-bridges`
- `get-bridge-route`
- `list-bridge-transactions`
- `get-bridge-transaction`
- `inspect-bridge-contract`

## Common Examples

List bridge pairs and active assets:

```bash
node platon-crosschain/scripts/crosschain.ts list-bridges --network mainnet
```

Find the Ethereum -> PlatON route for ETH:

```bash
node platon-crosschain/scripts/crosschain.ts get-bridge-route --network mainnet --from-chain ethereum --to-chain platon --symbol ETH
```

List recent successful bridge transactions:

```bash
node platon-crosschain/scripts/crosschain.ts list-bridge-transactions --network mainnet --status success --page 1 --page-size 20
```

Fetch a bridge transaction by event IDs:

```bash
node platon-crosschain/scripts/crosschain.ts get-bridge-transaction --network mainnet --event-history-id 12345 --event-history-pending-id 12344
```

Inspect contracts and route metadata for a bridge asset:

```bash
node platon-crosschain/scripts/crosschain.ts inspect-bridge-contract --network mainnet --from-chain ethereum --to-chain platon --symbol ETH
```

Query bridge status by transaction hash:

```bash
node platon-crosschain/scripts/crosschain.ts list-bridge-transactions --network mainnet --keyword <TX_HASH> --page 1 --page-size 20
```

Then use the returned `event_history_id` to fetch the full detail:

```bash
node platon-crosschain/scripts/crosschain.ts get-bridge-transaction --network mainnet --event-history-id <EVENT_HISTORY_ID> --event-history-pending-id <EVENT_HISTORY_PENDING_ID>
```

## Cast Guidance

For exact `cast` examples, read the targeted reference files:

- bridge API and command mapping: [`references/api-surface.md`](./references/api-surface.md)
- browser API summary: [`references/browser-api-summary.md`](./references/browser-api-summary.md)
- contract read and write guidance: [`references/contract-api-summary.md`](./references/contract-api-summary.md)
- environment base URLs: [`references/environment-map.md`](./references/environment-map.md)
- output model and error shape: [`references/output-contract.md`](./references/output-contract.md)

Write-flow rule:

- this skill prepares transaction information only
- users sign with an external wallet or signer
- signed raw transactions are then broadcast separately
- the full `approve` -> fee/limit check -> `lockAsset` / `redeemToken` -> status query flow is documented in `references/contract-api-summary.md`
