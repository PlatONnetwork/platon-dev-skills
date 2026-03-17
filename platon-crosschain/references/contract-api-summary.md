# Contract API Summary

## Scope

Only address-based EVM interfaces are in scope for v1.

Out of scope:

- universal interfaces
- `bytes32` receiver variants
- wallet signing flows inside the skill

## Read Methods

### `Source`

Useful view methods:

- `nativeSymbol()`
- `getTokenContract(string)`
- `getTokenCap(string)`
- `getSingleMinCap(string)`
- `getSingleMaxCap(string)`
- `getTokenAcrossFee(string)`
- `whitelist(address,string)`

Example `cast call`:

```bash
cast call <CCSOURCE_ADDRESS> "getSingleMinCap(string)" "ETH" --rpc-url <RPC_URL>
```

### `Target`

Useful view methods:

- `getTokenContract(string)`
- `getTokenCap(string)`
- `getSingleMinCap(string)`
- `getSingleMaxCap(string)`
- `getTokenFee(string)`
- `getTokenInfo(string)`
- `whitelist(address,string)`

Example `cast call`:

```bash
cast call <CCTARGET_ADDRESS> "getTokenFee(string)" "ETH" --rpc-url <RPC_URL>
```

## Write Guidance

### `lockAsset(address,string,uint256)`

Use on the source-side `Source` contract.

Preflight checklist:

- resolve the correct route and source proxy contract first
- confirm `srcSwitch = 1`
- query `getSingleMinCap(string)` and `getSingleMaxCap(string)`
- query `getTokenAcrossFee(string)` for the source-side fee
- ensure the bridge amount satisfies min and max cap checks
- ensure the bridge amount is greater than the effective fee
- if the bridged token is ERC20, `approve` the source contract first
- if the bridged token is native, set transaction `value = amount`

Recommended read checks:

```bash
cast call <SOURCE_PROXY_CONTRACT> "getSingleMinCap(string)" "<SYMBOL>" --rpc-url <SOURCE_RPC_URL>
cast call <SOURCE_PROXY_CONTRACT> "getSingleMaxCap(string)" "<SYMBOL>" --rpc-url <SOURCE_RPC_URL>
cast call <SOURCE_PROXY_CONTRACT> "getTokenAcrossFee(string)" "<SYMBOL>" --rpc-url <SOURCE_RPC_URL>
```

If the asset is ERC20, resolve the token contract first:

```bash
cast call <SOURCE_PROXY_CONTRACT> "getTokenContract(string)" "<SYMBOL>" --rpc-url <SOURCE_RPC_URL>
```

ERC20 `approve` preparation:

```bash
cast calldata "approve(address,uint256)" <SOURCE_PROXY_CONTRACT> <AMOUNT_IN_WEI>
```

After external signing, broadcast the signed raw `approve` transaction first. Wait until the approval is confirmed before preparing `lockAsset`.

`lockAsset` transaction preparation:

```bash
cast calldata "lockAsset(address,string,uint256)" <RECEIVER> "ETH" <AMOUNT_IN_WEI>
```

If the asset is native, the final transaction must carry `value = amount`.

If the asset is ERC20, `value` should usually be `0`.

After external signing, broadcast the signed raw transaction:

```bash
cast publish <SIGNED_LOCKASSET_TX> --rpc-url <SOURCE_RPC_URL>
```

Status lookup after broadcast:

Use the source transaction hash as the keyword:

```bash
node platon-crosschain/scripts/crosschain.ts list-bridge-transactions --network <mainnet|testnet> --keyword <SOURCE_TX_HASH> --page 1 --page-size 20
```

Then, if a matching item is returned, use its `event_history_id` and optional `event_history_pending_id` to fetch details:

```bash
node platon-crosschain/scripts/crosschain.ts get-bridge-transaction --network <mainnet|testnet> --event-history-id <EVENT_HISTORY_ID> --event-history-pending-id <EVENT_HISTORY_PENDING_ID>
```

### `redeemToken(address,string,uint256)`

Use on the target-side `Target` contract.

Preflight checklist:

- resolve the correct route and target proxy contract first
- confirm `targetSwitch = 1`
- query `getSingleMinCap(string)` and `getSingleMaxCap(string)`
- query `getTokenFee(string)` for the target-side redeem fee
- ensure the redeem amount satisfies min and max cap checks
- ensure the redeem amount is greater than the effective fee
- confirm token balance on the redeeming chain

Recommended read checks:

```bash
cast call <TARGET_PROXY_CONTRACT> "getSingleMinCap(string)" "<SYMBOL>" --rpc-url <TARGET_RPC_URL>
cast call <TARGET_PROXY_CONTRACT> "getSingleMaxCap(string)" "<SYMBOL>" --rpc-url <TARGET_RPC_URL>
cast call <TARGET_PROXY_CONTRACT> "getTokenFee(string)" "<SYMBOL>" --rpc-url <TARGET_RPC_URL>
```

If you need to confirm the mapped token contract:

```bash
cast call <TARGET_PROXY_CONTRACT> "getTokenContract(string)" "<SYMBOL>" --rpc-url <TARGET_RPC_URL>
```

`redeemToken` transaction preparation:

```bash
cast calldata "redeemToken(address,string,uint256)" <RECEIVER> "ETH" <AMOUNT_IN_WEI>
```

After external signing, broadcast the signed raw transaction:

```bash
cast publish <SIGNED_REDEEM_TX> --rpc-url <TARGET_RPC_URL>
```

Status lookup after broadcast:

Use the source transaction hash from the chain where `redeemToken` was sent:

```bash
node platon-crosschain/scripts/crosschain.ts list-bridge-transactions --network <mainnet|testnet> --keyword <REDEEM_TX_HASH> --page 1 --page-size 20
```

Then fetch the detailed bridge status if matched:

```bash
node platon-crosschain/scripts/crosschain.ts get-bridge-transaction --network <mainnet|testnet> --event-history-id <EVENT_HISTORY_ID> --event-history-pending-id <EVENT_HISTORY_PENDING_ID>
```

## Signing And Broadcast

The skill does not sign transactions.

Recommended flow:

1. Resolve the route and contract addresses with `platon-crosschain`.
2. Resolve the RPC endpoint with `platon-chainlist`.
3. Query fee and limit read methods before sending.
4. If ERC20, prepare and send `approve` first.
5. Build calldata and transaction fields.
6. Sign with an external wallet or signer.
7. Broadcast the signed raw transaction.
8. Query crosschain status by transaction hash, then drill into transaction details.

Example broadcast after external signing:

```bash
cast publish <SIGNED_RAW_TX> --rpc-url <RPC_URL>
```
