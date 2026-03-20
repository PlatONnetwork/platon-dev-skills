# UserOperation Cases

This document shows how a third-party integrator can build wallet actions using this repository's ERC-4337 flow.

The examples below focus on repository-specific execution behavior, not generic ERC-4337 examples.
`viem` snippets are convenience examples only. The underlying field order and encoding rules are intended to be implementable from any language.

## Shared assumptions

The examples below assume the integrator already knows:

- `entryPoint`
- `walletAddress`
- whether the wallet is already deployed
- whether `initCode` is needed
- whether a paymaster is used

## 1. UserOperation shape

A typical integration needs to reason about the following fields:

```ts
type UserOperation = {
  sender: `0x${string}`
  nonce: bigint
  initCode: `0x${string}`
  callData: `0x${string}`
  callGasLimit: bigint
  verificationGasLimit: bigint
  preVerificationGas: bigint
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  paymasterAndData: `0x${string}`
  signature: `0x${string}`
}
```

Language-agnostic note:

- field names and order must match the target `EntryPoint`'s `UserOperation` definition
- all byte fields such as `initCode`, `callData`, `paymasterAndData`, and `signature` are raw byte arrays even if your SDK displays them as hex strings
- do not treat SDK struct names as the protocol definition; the byte content is what matters

## 2. Read wallet nonce

### Goal

Read the current wallet nonce before building a `UserOperation` for a deployed wallet.

### Contracts involved

- `BaseWallet`

Language-agnostic requirement:

- read the wallet's current nonce from the deployed wallet contract before finalizing the `UserOperation`

### viem example

```ts
const baseWalletReadAbi = [
  {
    type: 'function',
    name: 'nonce',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const nonce = await publicClient.readContract({
  address: walletAddress,
  abi: baseWalletReadAbi,
  functionName: 'nonce',
})
```

### Notes

- For a wallet already deployed, always read the latest nonce before building the next request
- Prefer `BaseWallet.nonce()` as the primary source for deployed-wallet flows in this repository
- Only use `EntryPoint.getNonce(...)` if the target deployment is confirmed to support it
- Do not swallow nonce-read failures and silently reuse `0`
- Do not reuse cached nonce values across concurrent submissions

## 3. Encode wallet action through module execution

### Goal

Build `userOp.callData` using the execution path validated by this repository's tests.

### Contracts involved

- `BaseWallet`
- `ModuleManager`

### Why this matters

In this repository, the tested ERC-4337 execution path does not usually place `BaseWallet.execute(...)` directly as the top-level `userOp.callData`.

Instead, the normal flow is:

1. encode `BaseWallet.execute(...)`
2. wrap that payload inside `ModuleManager.executeFromModule(...)`

This works because `EntryPoint` is enabled as a module during wallet setup.

Language-agnostic requirement:

- `userOp.callData` must contain the ABI encoding of `executeFromModule(bytes)`
- the inner bytes argument must itself be the ABI encoding of `BaseWallet.execute(...)`

### viem example

```ts
import { encodeFunctionData } from 'viem'

const baseWalletExecuteAbi = [
  {
    type: 'function',
    name: 'execute',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
      { name: 'operation', type: 'uint8' },
    ],
    outputs: [],
  },
] as const

const moduleManagerAbi = [
  {
    type: 'function',
    name: 'executeFromModule',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_data', type: 'bytes' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

const walletExecutePayload = encodeFunctionData({
  abi: baseWalletExecuteAbi,
  functionName: 'execute',
  args: [targetAddress, 1000n, '0x', 0],
})

const callData = encodeFunctionData({
  abi: moduleManagerAbi,
  functionName: 'executeFromModule',
  args: [walletExecutePayload],
})
```

### Notes

- `operation = 0` means normal call
- `operation = 1` means delegatecall
- This module-wrapped path is the important repository-specific behavior

## 4. Encode ERC20 transfer through module execution

### Goal

Build a token transfer action using the module-wrapped execution path used in the repository tests.

Language-agnostic requirement:

- encode the ERC20 call first, then wrap it in `BaseWallet.execute(...)`, then wrap that in `executeFromModule(bytes)`

### viem example

```ts
const erc20Abi = [
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

const tokenTransferData = encodeFunctionData({
  abi: erc20Abi,
  functionName: 'transfer',
  args: [recipient, 1000n],
})

const walletExecutePayload = encodeFunctionData({
  abi: baseWalletExecuteAbi,
  functionName: 'execute',
  args: [tokenAddress, 0n, tokenTransferData, 0],
})

const callData = encodeFunctionData({
  abi: moduleManagerAbi,
  functionName: 'executeFromModule',
  args: [walletExecutePayload],
})
```

### Notes

- ERC20 transfer uses `value = 0`
- The wallet calls the ERC20 contract through its own execution path

## 5. Build `initCode` for first activation

### Goal

Use non-empty `initCode` when the wallet must be created during the first `UserOperation`.

Language-agnostic requirement:

- the bytes in `initCode` must match the exact factory call used for address prediction and wallet creation

### viem example

```ts
import { concatHex, encodeFunctionData } from 'viem'

const walletFactoryAbi = [
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

const createWalletData = encodeFunctionData({
  abi: walletFactoryAbi,
  functionName: 'createWallet',
  args: [walletLogic, initializer, salt],
})

const initCode = concatHex([walletFactory, createWalletData])
```

### Notes

- For deployed wallets, use `initCode = '0x'`
- For first activation, `sender` must match the predicted wallet address

## 6. Build a basic native transfer UserOperation

### Goal

Build a minimal `UserOperation` for a native transfer from a deployed wallet.

Language-agnostic requirement:

- assemble the full `UserOperation` struct with byte fields and integer fields matching the target `EntryPoint` ABI exactly

### viem example

```ts
const userOp = {
  sender: walletAddress,
  nonce,
  initCode: '0x',
  callData,
  callGasLimit: 100000n,
  verificationGasLimit: 100000n,
  preVerificationGas: 50000n,
  maxFeePerGas: 1000n,
  maxPriorityFeePerGas: 10000n,
  paymasterAndData: '0x',
  signature: '0x',
}
```

### Notes

- These gas values are examples only
- Real deployments should tune them per chain and flow

## 7. Get `userOpHash`

### Goal

Read the hash used as the input to the repository's signing flow.

### Contracts involved

- `EntryPoint`

Language-agnostic requirement:

- call `EntryPoint.getUserOpHash(userOp)` using the final unsigned `UserOperation` structure

### viem example

```ts
const entryPointAbi = [
  {
    type: 'function',
    name: 'getUserOpHash',
    stateMutability: 'view',
    inputs: [
      {
        name: 'userOp',
        type: 'tuple',
        components: [
          { name: 'sender', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'initCode', type: 'bytes' },
          { name: 'callData', type: 'bytes' },
          { name: 'callGasLimit', type: 'uint256' },
          { name: 'verificationGasLimit', type: 'uint256' },
          { name: 'preVerificationGas', type: 'uint256' },
          { name: 'maxFeePerGas', type: 'uint256' },
          { name: 'maxPriorityFeePerGas', type: 'uint256' },
          { name: 'paymasterAndData', type: 'bytes' },
          { name: 'signature', type: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
] as const

const userOpHash = await publicClient.readContract({
  address: entryPoint,
  abi: entryPointAbi,
  functionName: 'getUserOpHash',
  args: [userOp],
})
```

## 8. Sign the UserOperation using the repository's signature model

### Goal

Produce a signature that matches this repository's wallet validation logic.

### Important warning

Do not assume the wallet accepts a plain raw signature over `userOpHash`.

Do not output production code that sets:

```ts
userOp.signature = await walletClient.signMessage({ message: { raw: userOpHash } })
```

That is not the repository's final signing format.

In this repository, the tested flow is:

1. compute `userOpHash`
2. derive a project-specific signing hash from `userOpHash`, signature mode, and validation data
3. collect owner signatures over that derived hash
4. concatenate owner signatures in ascending owner-address order
5. wrap the result into the repository's encoded signature format

### Integration guidance

When documenting `viem` examples, present plain signing only as a conceptual placeholder. Production integration must follow the repository's signature encoding rules.

For the tested owner flow used by this repository:

1. compute `userOpHash`
2. compute `signHash = keccak256(abi.encodePacked(userOpHash, uint8(SignatureMode.owner), uint256(0)))`
3. sign `signHash` as a raw digest
4. concatenate signatures in ascending owner-address order
5. encode `userOp.signature` as:
- `bytes1(version=0x00)`
- `bytes1(dataType=0x00)`
- `uint256(signatureLength)`
- concatenated signatures

For a single owner, the final payload is:

```text
0x00 || 0x00 || uint256(65) || (r || s || v)
```

### Notes

- owner ordering matters
- signature packing matters
- threshold matters
- a generic `signMessage(userOpHash)` flow is not sufficient for this wallet

## 9. Multi-owner signature ordering

### Rule

When multiple owners sign, signatures must be concatenated in ascending owner-address order.

### Why this matters

The wallet signature validation logic enforces a strictly increasing owner order during verification.

### Practical implication

If signatures are valid individually but concatenated in the wrong order, validation can still fail.

## 10. Submit `handleOps`

### Goal

Submit one or more signed `UserOperation` items through `EntryPoint`.

Language-agnostic requirement:

- submit the signed `UserOperation[]` with field order and tuple layout matching the `handleOps` ABI exactly

### viem example

```ts
const handleOpsAbi = [
  {
    type: 'function',
    name: 'handleOps',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'ops',
        type: 'tuple[]',
        components: [
          { name: 'sender', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'initCode', type: 'bytes' },
          { name: 'callData', type: 'bytes' },
          { name: 'callGasLimit', type: 'uint256' },
          { name: 'verificationGasLimit', type: 'uint256' },
          { name: 'preVerificationGas', type: 'uint256' },
          { name: 'maxFeePerGas', type: 'uint256' },
          { name: 'maxPriorityFeePerGas', type: 'uint256' },
          { name: 'paymasterAndData', type: 'bytes' },
          { name: 'signature', type: 'bytes' },
        ],
      },
      { name: 'beneficiary', type: 'address' },
    ],
    outputs: [],
  },
] as const

const txHash = await walletClient.writeContract({
  address: entryPoint,
  abi: handleOpsAbi,
  functionName: 'handleOps',
  args: [[signedUserOp], beneficiary],
  account,
})
```

### Notes

- In production, this call may be submitted by a bundler or relayer
- If execution fails, inspect sender, nonce, signature, gas fields, and paymaster assumptions

## 11. Common mistakes

- placing `BaseWallet.execute(...)` directly at the top level instead of wrapping it through module execution
- using `initCode` for an already deployed wallet
- forgetting `initCode` for first activation
- reading an outdated nonce
- signing the wrong hash
- packing multi-owner signatures in the wrong order
- assuming a generic ERC-4337 signature format

## 12. Related documents

- `signature-model.md`
- `cases-create-wallet.md`
- `cases-paymaster.md`
- `contract-api.md`
- `troubleshooting.md`
