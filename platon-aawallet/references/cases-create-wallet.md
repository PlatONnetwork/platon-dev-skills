# Wallet Creation Cases

This document shows how a third-party integrator can predict or create a wallet for this repository.

These examples focus on the repository's wallet creation flow and counterfactual address behavior.
`viem` snippets are convenience examples only. The initializer bytes, factory call encoding, and address prediction inputs are intended to be implementable from any language.

## Shared assumptions

The examples below assume the integrator already knows:

- `entryPoint`
- `walletLogic`
- `walletFactory`
- `owners`
- `threshold`
- `salt`
- `initializerTarget`
- `initializerData`
- `fallbackHandler`
- `lockPeriod`

## 1. Encode `BaseWallet.setup(...)`

### Goal

Build the initializer used for wallet prediction and wallet creation.

### Contracts involved

- `BaseWallet`

Language-agnostic requirement:

- produce the exact ABI encoding of `BaseWallet.setup(...)`
- use the same byte-for-byte initializer for both prediction and deployment

### viem example

```ts
import { encodeFunctionData } from 'viem'

const baseWalletAbi = [
  {
    type: 'function',
    name: 'setup',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_aaEntryPoint', type: 'address' },
      { name: '_owners', type: 'address[]' },
      { name: '_threshold', type: 'uint256' },
      { name: '_to', type: 'address' },
      { name: '_data', type: 'bytes' },
      { name: '_fallbackHandler', type: 'address' },
      { name: '_lockPeriod', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

const initializer = encodeFunctionData({
  abi: baseWalletAbi,
  functionName: 'setup',
  args: [
    entryPoint,
    owners,
    BigInt(threshold),
    initializerTarget,
    initializerData,
    fallbackHandler,
    BigInt(lockPeriod),
  ],
})
```

### Notes

- The exact encoded `initializer` affects the derived wallet address
- Prediction and creation must use exactly the same `initializer`
- Any change to owners, threshold, `_to`, `_data`, fallback handler, or lock period changes the wallet address

### Common mistakes

- changing owner order between prediction and creation
- changing threshold between prediction and creation
- omitting fallback handler or lock period in one flow but not the other

## 2. Predict wallet address

### Goal

Compute the future wallet address before deployment.

### Contracts involved

- `WalletProxyFactory`

Language-agnostic requirement:

- call `getWalletAddress(walletLogic, initializer, salt)` with the exact same bytes later used for creation

### viem example

```ts
const walletFactoryAbi = [
  {
    type: 'function',
    name: 'getWalletAddress',
    stateMutability: 'view',
    inputs: [
      { name: '_implementation', type: 'address' },
      { name: '_initializer', type: 'bytes' },
      { name: '_salt', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
] as const

const predictedWallet = await publicClient.readContract({
  address: walletFactory,
  abi: walletFactoryAbi,
  functionName: 'getWalletAddress',
  args: [walletLogic, initializer, salt],
})
```

### Notes

- `walletLogic`, `initializer`, and `salt` must match the later creation call
- The factory internally derives a new salt from `initializer` and `salt`, so exact byte equality matters

## 3. Create wallet directly

### Goal

Deploy the wallet through the factory without waiting for the first `UserOperation`.

Language-agnostic requirement:

- submit the same `createWallet(walletLogic, initializer, salt)` call regardless of SDK

### viem example

```ts
const walletFactoryWriteAbi = [
  {
    type: 'function',
    name: 'createWallet',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_implementation', type: 'address' },
      { name: '_initializer', type: 'bytes' },
      { name: '_salt', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
] as const

const hash = await walletClient.writeContract({
  address: walletFactory,
  abi: walletFactoryWriteAbi,
  functionName: 'createWallet',
  args: [walletLogic, initializer, salt],
  account,
})

const receipt = await publicClient.waitForTransactionReceipt({ hash })
```

### Notes

- This path is useful when the integrator wants the wallet deployed before building later `UserOperation`
- Direct deployment still requires the same initializer consistency rules as counterfactual deployment

## 4. Build `initCode` for first activation

### Goal

Prepare the `initCode` used when the wallet should be created inside the first `UserOperation`.

Language-agnostic requirement:

- `initCode` must be raw bytes equal to `walletFactoryAddress || createWalletCalldata`

### viem example

```ts
import { concatHex, encodeFunctionData } from 'viem'

const createWalletData = encodeFunctionData({
  abi: walletFactoryWriteAbi,
  functionName: 'createWallet',
  args: [walletLogic, initializer, salt],
})

const initCode = concatHex([walletFactory, createWalletData])
```

### Notes

- In this repository, `initCode` follows the usual `factory address + factory calldata` layout
- The `sender` for the first `UserOperation` should match the address predicted from the same inputs

## 5. Compare direct deployment and first activation

### Direct deployment

Use this when:

- the backend wants to deploy the wallet first
- later actions can assume the wallet already exists

### First activation through `initCode`

Use this when:

- the wallet should be created only on first use
- the external service wants a counterfactual onboarding flow

### Important rule

Both flows must use the same:

- `walletLogic`
- `initializer`
- `salt`
- `walletFactory`

## 6. Address consistency checklist

Before using a predicted wallet address, verify:

- the same `walletFactory` is used
- the same `walletLogic` is used
- the same encoded `initializer` bytes are used
- the same `salt` is used
- owner ordering is unchanged
- setup-related zero addresses were not silently replaced

## 7. Related documents

- `contract-api.md`
- `cases-userop.md`
- `troubleshooting.md`
