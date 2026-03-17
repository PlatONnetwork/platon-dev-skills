# Environment Map

## Status

Live endpoints were verified on 2026-03-17.

Resolved environment map:

- `mainnet` portal API: `https://bridge.platon.network`
- `mainnet` browser API: `https://bridgescan.platon.network`
- `testnet` portal API: `https://testbridge.platon.network`
- `testnet` browser API: `https://testbridgescan.platon.network`

## Notes

The original source notes had the mainnet and testnet bridge hosts reversed.

Implementation should use the fixed internal mapping above instead of trusting free-form hostnames.
