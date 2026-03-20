# Troubleshooting

This document helps third-party integrators diagnose common failures when integrating with this wallet system.

Use it when a wallet address is wrong, wallet creation fails, signature validation fails, paymaster integration does not work, or `handleOps` fails.

## 1. Predicted wallet address does not match actual address

### Symptom

- `getWalletAddress(...)` returns one address
- actual deployed wallet appears at a different address

### Likely causes

- different `initializer`
- different `salt`
- different `walletLogic`
- different factory address
- different owner ordering
- different threshold or setup options

### What to check

- compare the exact encoded `initializer` bytes
- verify `walletLogic`
- verify `salt`
- verify `walletFactory`
- verify owner order and threshold

### Fix

Use the exact same `walletLogic`, `initializer`, `salt`, and factory in prediction and creation flows.

## 2. Wallet creation fails

### Symptom

- `createWallet(...)` reverts
- the first `UserOperation` with `initCode` fails during account creation

### Likely causes

- `walletLogic` is not deployed
- `initializer` is invalid
- wallet already exists
- setup path reverts
- malformed `initCode`

### What to check

- confirm code exists at `walletLogic`
- confirm the initializer encodes `BaseWallet.setup(...)`
- confirm the wallet is not already deployed
- confirm `initCode = factory address + createWallet calldata`

## 3. UserOperation fails before execution

### Symptom

- validation fails
- the request never reaches the intended wallet action

### Likely causes

- wrong nonce
- wrong sender
- using `walletFactory` as `sender`
- wrong `initCode`
- wrong signature format
- insufficient prefund
- invalid paymaster data
- gas fields too low

### What to check

- verify `sender` is the real wallet address, not `walletFactory`, `walletLogic`, or a paymaster
- verify sender equals the predicted wallet address or the known deployed wallet address
- if wallet reads such as `entryPoint()`, `threshold()`, `owners(...)`, or `isOwner(...)` revert, first suspect that `sender` is not a wallet instance
- read the latest nonce from `BaseWallet.nonce()` for deployed-wallet flows
- only use `EntryPoint.getNonce(...)` when the target deployment is confirmed to support it
- verify `initCode` usage matches wallet deployment state
- verify signature format matches the repository model
- verify gas fields and paymaster state

## 4. Signature validation fails

### Symptom

- `validateUserOp(...)` fails
- execution is rejected as unauthorized

### Likely causes

- signing the wrong hash
- using the wrong signer
- wrong owner ordering in concatenated signatures
- signature packing does not match repository expectations
- threshold not satisfied

### What to check

- verify the signer is an owner
- verify the signed hash follows the repository signing flow
- verify signatures are concatenated in ascending owner-address order
- verify threshold is met

### Fix

Treat signature format as repository-specific. Do not assume a generic one-signer `signMessage(userOpHash)` flow.

## 5. Nonce mismatch

### Symptom

- operation fails with nonce-related validation issues

### Likely causes

- cached nonce
- concurrent requests built from the same nonce
- confusing undeployed and deployed wallet flows

### What to check

- read the latest wallet nonce immediately before building the request
- prefer `BaseWallet.nonce()` for a deployed wallet
- only use `EntryPoint.getNonce(...)` if that deployment is known to expose it
- never replace a failed nonce read with a silent default `0`
- verify no other operation consumed the nonce first

## 6. Wallet action fails during execution

### Symptom

- validation passes but the target action does not complete

### Likely causes

- malformed `callData`
- wrong target address
- wrong operation type
- insufficient wallet balance
- wrong execution path

### What to check

- verify the repository uses the module-wrapped path
- verify `userOp.callData` is encoded as expected
- verify target balance and token balance
- verify `operation = 0` for normal calls

### Fix

Rebuild the call as:

1. `BaseWallet.execute(...)`
2. wrapped inside `ModuleManager.executeFromModule(...)`

## 7. TokenPaymaster flow fails

### Symptom

- the action fails only when TokenPaymaster is used

### Likely causes

- unsupported token
- missing allowance
- allowance too low
- token balance too low
- wrong `paymasterAndData` encoding
- wrong first-activation call structure
- paymaster funding or stake problem

### What to check

- confirm token support
- confirm wallet token balance
- confirm allowance to TokenPaymaster
- confirm `paymasterAndData` is encoded as `(token, maxCost)` after the paymaster address
- if `initCode` is present, confirm `callData` uses `executeBatchFromModule(bytes[])`

## 8. SponsorPaymaster flow fails

### Symptom

- sponsor flow fails while direct or token-based flow works

### Likely causes

- wrong sponsor paymaster address
- insufficient paymaster funding
- deployment-specific sponsor policy not satisfied

### What to check

- confirm sponsor paymaster address for the current network
- confirm sponsor deposit and available funds
- confirm whether the deployment environment adds off-chain sponsor rules

## 9. Debugging checklist

When troubleshooting, compare these values first:

- `entryPoint`
- `walletFactory`
- `walletLogic`
- `sender`
- whether `sender` is actually a wallet instance
- `nonce`
- `initializer`
- `initCode`
- `callData`
- `paymasterAndData`
- `signature`

## 10. Related documents

- `prerequisites.md`
- `signature-model.md`
- `contract-api.md`
- `cases-create-wallet.md`
- `cases-userop.md`
- `cases-paymaster.md`
