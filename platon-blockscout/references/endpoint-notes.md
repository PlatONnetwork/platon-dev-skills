# Endpoint Notes

Validated on March 16, 2026:

- Mainnet base URL: `https://blockscout.platon.network`
- Devnet base URL: `https://devnet3blockscout.platon.network`

Observed response shapes:

- `/api/v2/main-page/blocks`
  - returns a bare array, not an envelope
  - block count field is `transactions_count`
- `/api/v2/search`
  - returns `items` plus `next_page_params`
  - token address field is `address_hash`
- `/api/v2/addresses/{address}`
  - native balance field is `coin_balance`
  - useful booleans include `has_tokens`, `has_token_transfers`, `has_validated_blocks`
- `/api/v2/addresses/{address}/tokens`
  - item balance field is `value`
  - token address field is `token.address_hash`
  - `items_count` may not be strictly honored by the upstream instance
- `/api/v2/addresses/{address}/nft/collections`
  - collection address field is `token.address_hash`
  - token instances are included in the collection response
- `/api/v2/blocks/{number_or_hash}/transactions`
  - returns `{ items, next_page_params }`
- `/api/v2/transactions/{hash}`
  - decoded method may appear under `decoded_input.method_call`
  - `method` may also be a human-readable string
  - token transfer amount is under `token_transfers[].total.value`
- `/api/v2/transactions/{hash}/logs`
  - returns `{ items, next_page_params }`
  - log emitter address may be nested under `address.hash`
- `/api/v2/addresses/{address}/logs`
  - returns `{ items, next_page_params }`
  - useful stable fields are `block_number`, `transaction_hash`, `topics`, `data`, `decoded`, `index`
- `/api/v2/smart-contracts/{address}`
  - unverified contracts may return only proxy fields such as `proxy_type` and `implementations`
  - do not assume `abi`, `name`, `language`, or `source_code` exist
- `/api/v2/advanced-filters`
  - returns `{ items, next_page_params, search_params }`
  - transaction hash field is `hash`

Current cautions:

- Prefer `/api/v2` endpoints over legacy `/api`.
- Do not depend on Blockscout-specific metadata endpoints unless they are validated for both PlatON mainnet and devnet.
- Treat missing ABI or source metadata as a normal `NOT_FOUND` path, not a parser failure.

## Known Good Samples

Verified contract:

- `0xF4A07d980A56f67F6ea178c3918B21DCAE1b4E50`
  - verified on mainnet
  - works with `get-contract-abi`
  - works with `inspect-contract`

Verified transaction and logs sample:

- transaction: `0xd7fafb0eb6ae081594d8fcafbce60c0888fbf54c526c6b81b21e8f3c67dc50a3`
  - works with `get-transaction`
  - works with `get-transaction-logs`

Address samples:

- `0xDF66EC4Df18a770E82e999C68c2C0D737a5949Fc`
  - works with `get-address-info`
- `0xeac734fb7581D8eB2CE4949B0896FC4E76769509`
  - works with `get-address-logs`
