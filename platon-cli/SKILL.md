---
name: platon-cli
description: Use Foundry `cast` to query PlatON on-chain data from mainnet or devnet over RPC. Use when a user asks to inspect blocks, transactions, receipts, balances, code, storage, logs, contract calls, gas price, nonce, or other direct chain data from PlatON. Accept network aliases `mainnet` and `main`, plus `dev`, `testnet`, and `devnet`.
metadata: {"openclaw":{"requires":{"bins":["cast"]},"install":[{"id":"foundry","kind":"shell","command":"curl -L https://foundry.paradigm.xyz | bash && foundryup","bins":["cast"],"label":"Install Foundry (cast)"}]}}
---

# PlatON CLI

## Overview

Use Foundry `cast` to query PlatON chain data from mainnet or devnet. Prefer explicit `--rpc-url` usage so every command is reproducible and does not depend on ambient shell state.

## Setup

Install Foundry (includes `cast`):

```bash
curl -L https://foundry.paradigm.xyz | bash foundryup --install  v1.6.0-rc1
```

Set RPC (optional):

```bash
export ETH_RPC_URL="https://openapi2.platon.network/rpc"
```

When the user needs the latest validated PlatON endpoints, first use `$platon-chainlist`.

## Check Balance

```bash
cast balance <ADDRESS> --rpc-url https://openapi2.platon.network/rpc
```

In LAT (human readable):

```bash
cast balance <ADDRESS> --ether --rpc-url https://openapi2.platon.network/rpc
```

## Transaction Info

```bash
cast tx <TX_HASH> --rpc-url https://openapi2.platon.network/rpc
```

Transaction receipt:

```bash
cast receipt <TX_HASH> --rpc-url https://openapi2.platon.network/rpc
```

## Gas Price

```bash
cast gas-price --rpc-url https://openapi2.platon.network/rpc
```

In gwei:

```bash
cast --to-unit $(cast gas-price --rpc-url https://openapi2.platon.network/rpc) gwei
```

## Block Info

Latest block:

```bash
cast block latest --rpc-url https://openapi2.platon.network/rpc
```

Specific block:

```bash
cast block <BLOCK_NUMBER> --rpc-url https://openapi2.platon.network/rpc
```

## Contract Call

```bash
cast call <CONTRACT> "balanceOf(address)(uint256)" <ADDRESS> --rpc-url https://openapi2.platon.network/rpc
```

Read another view function:

```bash
cast call <CONTRACT> "<FUNCTION_SIGNATURE>" <ARGS...> --rpc-url https://openapi2.platon.network/rpc
```

## Publish Transaction

Broadcast a raw signed transaction:

```bash
cast publish <SIGNED_TX_HEX> --rpc-url https://openapi2.platon.network/rpc
```

## Send Transaction

Send a state-changing transaction with a private key:

```bash
cast send <CONTRACT> "transfer(address,uint256)" <TO> <AMOUNT> \
  --private-key <PRIVATE_KEY> \
  --rpc-url https://openapi2.platon.network/rpc
```

Send native LAT:

```bash
cast send <TO> --value 1ether \
  --private-key <PRIVATE_KEY> \
  --rpc-url https://openapi2.platon.network/rpc
```

## Estimate Gas

Estimate gas for a contract write:

```bash
cast estimate <CONTRACT> "transfer(address,uint256)" <TO> <AMOUNT> --rpc-url https://openapi2.platon.network/rpc
```

Estimate gas for native transfer:

```bash
cast estimate <TO> --value 1ether --rpc-url https://openapi2.platon.network/rpc
```

## Contract Code

```bash
cast code <ADDRESS> --rpc-url https://openapi2.platon.network/rpc
```

## Storage

```bash
cast storage <ADDRESS> <SLOT> --rpc-url https://openapi2.platon.network/rpc
```

## Logs

```bash
cast logs --rpc-url https://openapi2.platon.network/rpc --address <ADDRESS> --from-block <START> --to-block <END>
```

## Account Nonce

```bash
cast nonce <ADDRESS> --rpc-url https://openapi2.platon.network/rpc
```

## Chain Info

```bash
cast chain-id --rpc-url https://openapi2.platon.network/rpc
```

## Address Conversion

Convert between PlatON `lat` bech32 addresses and `0x` hex addresses:

```bash
node platon-cli/scripts/address_convert.ts lat1jt5xgxdca0hvs9ffhsk0a70zykwd8vjfc5aefl
```

Convert `0x` to `lat`:

```bash
node platon-cli/scripts/address_convert.ts 0x92e86419B8EbeEC81529bC2CfEf9E2259CD3B249
```

The script auto-detects the input format and prints the converted address.

## Public RPC Endpoints

| Network | Protocol | URL |
|---------|----------|-----|
| Mainnet | HTTP | https://openapi2.platon.network/rpc |
| Mainnet | WS | wss://openapi2.platon.network/ws |
| Devnet | HTTP | https://devnet3openapi.platon.network/rpc |
| Devnet | WS | wss://devnet3openapi.platon.network/ws |

Network aliases:

- `mainnet`, `main`
- `dev`, `testnet`, `devnet`
## Notes

- Addresses are 0x-prefixed hex (42 characters)
- Gas prices fluctuate; check before transactions
- Rate limits apply on public RPCs
- Use `--rpc-url` or set `ETH_RPC_URL` environment variable
