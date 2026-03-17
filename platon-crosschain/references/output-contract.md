# Output Contract

## Success Envelope

```json
{
  "ok": true,
  "command": "list-bridges",
  "network": "mainnet",
  "data": {}
}
```

## Error Envelope

```json
{
  "ok": false,
  "command": "get-bridge-route",
  "network": "mainnet",
  "error": {
    "code": "NOT_FOUND",
    "message": "No active bridge route matched ethereum -> platon for symbol ETH"
  }
}
```

## Recommended Error Codes

- `INVALID_ARGUMENT`
- `NOT_FOUND`
- `UNSUPPORTED_NETWORK`
- `UPSTREAM_ERROR`
- `NOT_IMPLEMENTED`

## Notes

- The envelope should stay aligned with the pattern already used by `platon-blockscout`.
- Route and transaction payloads should be normalized; raw upstream payloads should be avoided by default.
