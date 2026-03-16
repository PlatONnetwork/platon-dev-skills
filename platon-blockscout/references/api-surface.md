# API Surface

This skill targets these PlatON Blockscout base URLs:

- `https://blockscout.platon.network`
- `https://devnet3blockscout.platon.network`

Primary command-to-endpoint mapping:

- `lookup-token`: `/api/v2/search`
- `get-contract-abi`: `/api/v2/smart-contracts/{address}`
- `inspect-contract`: `/api/v2/smart-contracts/{address}`
- `get-address-info`: `/api/v2/addresses/{address}`
- `get-tokens`: `/api/v2/addresses/{address}/tokens`
- `get-nfts`: `/api/v2/addresses/{address}/nft/collections`
- `get-block-info`: `/api/v2/blocks/{number_or_hash}`
- `get-transaction`: `/api/v2/transactions/{hash}`
- `get-transaction-logs`: `/api/v2/transactions/{hash}/logs`
- `get-address-logs`: `/api/v2/addresses/{address}/logs`
- `get-transactions`: `/api/v2/advanced-filters`
- `get-token-transfers`: `/api/v2/advanced-filters`

Treat all endpoints as instance-specific. If a command fails with `UNSUPPORTED_ENDPOINT`, prefer falling back to another skill instead of guessing undocumented behavior.

## Supported Commands

These commands are implemented in the current `platon-blockscout` skill:

| Command | Endpoint | Extra Reference |
| --- | --- | --- |
| `lookup-token` | `/api/v2/search` | `blockscout-api/search.md` |
| `get-contract-abi` | `/api/v2/smart-contracts/{address}` | `blockscout-api/smart-contracts.md` |
| `inspect-contract` | `/api/v2/smart-contracts/{address}` | `blockscout-api/smart-contracts.md` |
| `get-address-info` | `/api/v2/addresses/{address}` | `blockscout-api/addresses.md` |
| `get-tokens` | `/api/v2/addresses/{address}/tokens` | `blockscout-api/addresses.md` |
| `get-nfts` | `/api/v2/addresses/{address}/nft/collections` | `blockscout-api/addresses.md` |
| `get-block-info` | `/api/v2/blocks/{number_or_hash}` | `blockscout-api/blocks.md` |
| `get-transaction` | `/api/v2/transactions/{hash}` | `blockscout-api/transactions.md` |
| `get-transaction-logs` | `/api/v2/transactions/{hash}/logs` | `blockscout-api/transactions.md` |
| `get-address-logs` | `/api/v2/addresses/{address}/logs` | `blockscout-api/addresses.md` |
| `get-transactions` | `/api/v2/advanced-filters` | `blockscout-api/transactions.md` |
| `get-token-transfers` | `/api/v2/advanced-filters` | `blockscout-api/transactions.md` |

## Reference Only

The files under `blockscout-api/` document upstream Blockscout endpoints more broadly than this skill currently implements.

Use them as:

- upstream API reference
- endpoint discovery material for future commands
- parameter and field reference when validating PlatON-specific behavior

Do not assume every endpoint listed there is currently exposed as a `platon-blockscout` command.
