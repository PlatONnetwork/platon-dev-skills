# API Surface

## Supported Commands

### `list-bridges`

- upstream: `GET /portal-api/bridge/defaults`
- purpose: list bridge routes, chain pairs, proxy contracts, switches, and active assets
- output: normalized route list with only `depositStatus = 1` assets

### `get-bridge-route`

- upstream: `GET /portal-api/bridge/defaults`
- purpose: resolve one route by source chain, destination chain, and optional symbol
- output: matched route, source and destination contracts, asset metadata, and cast-oriented hints
- note: route output does not expose `rpc_url` or `ws_url`; resolve RPC separately with `platon-chainlist`

### `list-bridge-transactions`

- upstream: `POST /browser-api/transaction/list`
- purpose: query bridge transaction history
- filters: `page`, `pageSize`, `status`, `keyWord`
- output: normalized list result plus pagination

### `get-bridge-transaction`

- upstream: `POST /browser-api/transaction/details`
- purpose: query full details for a single bridge transaction
- required args: `eventHistoryId`
- optional args: `eventHistoryPendingId`

### `inspect-bridge-contract`

- upstream: route config from `/portal-api/bridge/defaults`
- purpose: explain the relevant `Source` and `Target` contract addresses and the read methods that matter for the selected route

## Reference Only

These are documented for operator guidance or future extension, but are not first-class skill commands in v1:

- `Source.lockAsset(address,string,uint256)`
- `Target.redeemToken(address,string,uint256)`
- ERC20 `approve(address,uint256)`
- signed raw transaction broadcast after external signing
