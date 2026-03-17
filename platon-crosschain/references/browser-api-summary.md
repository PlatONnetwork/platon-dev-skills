# Browser API Summary

## Base Pattern

Responses use the envelope:

```json
{
  "code": 10000,
  "msg": "SUCCESS",
  "traceId": "xxx",
  "data": {}
}
```

## `POST /browser-api/transaction/list`

Request body:

```json
{
  "pageNum": 1,
  "pageSize": 10,
  "status": 4,
  "keyWord": ""
}
```

Status mapping:

- `0` = all
- `1` = from-pending
- `2` = reviewing
- `3` = to-pending
- `4` = success
- `5` = fail

Key result fields:

- `eventHistoryId`
- `eventHistoryPendingId`
- `bridgeCode`
- `txHash`
- `remoteTxHash`
- `eventType`
- `status`
- `rollbackStatus`
- `srcChain`
- `destChain`
- `symbol`
- `fromAddress`
- `toAddress`
- `fromValue`
- `toValue`
- `fee`
- `scanUrl`
- `remoteScanUrl`
- `date`

## `POST /browser-api/transaction/details`

Request body:

```json
{
  "eventHistoryId": 12345,
  "eventHistoryPendingId": 12344
}
```

The detail payload extends the list entry with richer address, contract, and failure fields.

## Notes

- The skill should normalize status values to lowercase stable enums.
- `eventHistoryId` is required in v1.
- `eventHistoryPendingId` is optional and may be `null`.

## Query By Transaction Hash

The browser API does not expose a dedicated `txHash` detail endpoint in the current v1 flow.

The recommended lookup pattern is:

1. Call `list-bridge-transactions`.
2. Pass the source-chain or destination-chain transaction hash through `keyWord`.
3. Read the matched `eventHistoryId` and optional `eventHistoryPendingId`.
4. Call `get-bridge-transaction` for the full bridge status.

Example:

```bash
node platon-crosschain/scripts/crosschain.ts list-bridge-transactions --network <mainnet|testnet> --keyword <TX_HASH> --page 1 --page-size 20
```

Then:

```bash
node platon-crosschain/scripts/crosschain.ts get-bridge-transaction --network <mainnet|testnet> --event-history-id <EVENT_HISTORY_ID> --event-history-pending-id <EVENT_HISTORY_PENDING_ID>
```
