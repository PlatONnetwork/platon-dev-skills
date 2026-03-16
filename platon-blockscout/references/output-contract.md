# Output Contract

Successful responses:

```json
{
  "data": {},
  "pagination": {
    "next_cursor": null,
    "has_next": false
  },
  "meta": {
    "command": "get-transaction",
    "network": "mainnet",
    "source": "blockscout",
    "timestamp": "2026-03-16T00:00:00.000Z"
  }
}
```

Error responses:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  },
  "meta": {
    "command": "get-transaction",
    "network": "mainnet",
    "source": "blockscout"
  }
}
```

Rules:

- Keep big integers as strings.
- Preserve upstream timestamps as strings.
- Emit machine-readable JSON to stdout.
- Use stderr only for unexpected process-level failures.

## Examples

Paginated logs response:

```json
{
  "data": {
    "transaction_hash": "0xd7fafb0eb6ae081594d8fcafbce60c0888fbf54c526c6b81b21e8f3c67dc50a3",
    "items": [
      {
        "address": "0xeac734fb7581D8eB2CE4949B0896FC4E76769509",
        "block_number": 143967685,
        "index": 0,
        "topics": ["0xddf252ad...", "0x0000...", "0x0000..."],
        "data": "0x00000000000000000000000000000000000000000000000000000000000b6270",
        "decoded": {
          "method_call": "Transfer(address indexed from, address indexed to, uint256 value)",
          "method_id": "ddf252ad"
        },
        "data_truncated": false
      }
    ],
    "total_returned": 1
  },
  "pagination": {
    "next_cursor": null,
    "has_next": false
  },
  "meta": {
    "command": "get-transaction-logs",
    "network": "mainnet",
    "source": "blockscout",
    "timestamp": "2026-03-16T08:26:11.416Z"
  }
}
```

Verified contract missing ABI:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Contract ABI is not available for this address"
  },
  "meta": {
    "command": "get-contract-abi",
    "network": "mainnet",
    "source": "blockscout"
  }
}
```
