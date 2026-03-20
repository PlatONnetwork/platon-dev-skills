# Paymaster Cases

This document shows how a third-party integrator can use `SponsorPaymaster` or `TokenPaymaster` in ERC-4337 flows for this repository.

It focuses on repository-specific integration behavior and request construction.
`viem` snippets are convenience examples only. The actual `paymasterAndData` rules are byte-level rules that can be implemented from any language.

## Shared assumptions

The examples below assume the integrator already knows:

- `entryPoint`
- `walletAddress`
- `tokenPaymaster`
- `sponsorPaymaster`
- whether the wallet is already deployed
- whether the paymaster is already funded and staked

## 1. When to use a paymaster

Use a paymaster when:

- the wallet should not cover gas directly through normal prefund behavior
- a backend or sponsor wants to cover gas
- gas should be paid using a supported ERC20 token

Before choosing a paymaster flow, confirm:

- the paymaster address is correct for the current network
- the paymaster has enough active deposit and stake
- project-specific sponsor or token assumptions are satisfied

## 2. SponsorPaymaster integration

### Important note

In the current repository version, SponsorPaymaster does not show a complex custom authorization payload format inside its paymaster validation logic.

That means third-party integrators should treat sponsor usage as deployment-specific:

- if the deployed environment documents extra sponsor payload requirements, follow that environment
- otherwise, do not invent an additional sponsor signature format that is not present in the contract behavior

### `paymasterAndData` rule

In the current repository version, SponsorPaymaster only relies on the paymaster address extracted from the first 20 bytes of `paymasterAndData`.

- `SponsorPaymaster` does not decode or use `paymasterAndData[20:]`
- the minimal usable sponsor value is `abi.encodePacked(address(sponsorPaymaster))`
- in any SDK or language, a 20-byte paymaster address payload is sufficient for the current on-chain implementation
- this differs from `TokenPaymaster`, which requires extra ABI-encoded data after the first 20 bytes

### Example placeholder

```ts
const userOp = {
  sender: walletAddress,
  nonce,
  initCode,
  callData,
  callGasLimit,
  verificationGasLimit,
  preVerificationGas,
  maxFeePerGas,
  maxPriorityFeePerGas,
  paymasterAndData: sponsorPaymasterAddress,
  signature: '0x',
}
```

### Notes

- current contract behavior is mainly about available sponsor funds and deposit handling
- deployment-specific policy may still exist outside the contract and should be documented separately

## 3. TokenPaymaster integration

### Goal

Use a supported ERC20 token to cover gas through `TokenPaymaster`.

### Preconditions

Before building the request, verify:

- the token is supported
- the wallet has enough token balance
- the wallet has approved the paymaster when required
- price assumptions are current
- `maxCost` will include a safety margin

## 4. Approve TokenPaymaster to spend ERC20

### Goal

Allow TokenPaymaster to charge the wallet in the supported token.

### viem example

```ts
import { encodeFunctionData } from 'viem'

const erc20Abi = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

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

const moduleManagerBatchAbi = [
  {
    type: 'function',
    name: 'executeBatchFromModule',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_data', type: 'bytes[]' }],
    outputs: [{ name: '', type: 'bool[]' }],
  },
] as const

const approveData = encodeFunctionData({
  abi: erc20Abi,
  functionName: 'approve',
  args: [tokenPaymaster, maxTokenCost],
})

const walletApprovePayload = encodeFunctionData({
  abi: baseWalletExecuteAbi,
  functionName: 'execute',
  args: [tokenAddress, 0n, approveData, 0],
})

const batchCallData = encodeFunctionData({
  abi: moduleManagerBatchAbi,
  functionName: 'executeBatchFromModule',
  args: [[walletApprovePayload]],
})
```

### Notes

- this batch style is especially important for first-wallet-creation flows with TokenPaymaster
- for already deployed wallets, approval may be done in a prior operation

## 5. Build `paymasterAndData` for TokenPaymaster

### Goal

Attach token-based payment data in the format expected by the current TokenPaymaster implementation.

### Format

In the current repository version:

- first 20 bytes: TokenPaymaster address
- remaining bytes: ABI-encoded `(address token, uint256 maxCost)`

Language-agnostic interpretation:

- bytes `0..19`: paymaster address
- bytes `20..`: standard ABI encoding of `(address token, uint256 maxCost)`
- if you are not using a Solidity helper or a TypeScript ABI coder, you must still produce standard ABI encoding for those two values

### viem example

```ts
import { encodeAbiParameters, concatHex } from 'viem'

const paymasterData = encodeAbiParameters(
  [
    { name: 'token', type: 'address' },
    { name: 'maxCost', type: 'uint256' },
  ],
  [tokenAddress, maxTokenCost],
)

const paymasterAndData = concatHex([
  tokenPaymaster,
  paymasterData,
])
```

### Notes

- `maxCost` should include margin above the estimated requirement
- do not assume exact lower-bound token estimates are sufficient
- TokenPaymaster and SponsorPaymaster do not share the same payload format beyond the common first 20-byte paymaster address

## 6. First wallet activation with TokenPaymaster

### Goal

Create the wallet and approve TokenPaymaster in the same `UserOperation`.

### Important repository-specific rule

If `initCode` is non-empty, TokenPaymaster expects a special call structure.

The `UserOperation` must use:

- `initCode` for wallet creation
- `callData = executeBatchFromModule(bytes[])`
- batch entries that each encode `BaseWallet.execute(...)`
- at least one approve call that authorizes TokenPaymaster to spend the selected token

### Example outline

```ts
const callData = encodeFunctionData({
  abi: moduleManagerBatchAbi,
  functionName: 'executeBatchFromModule',
  args: [[walletApprovePayload]],
})

const userOpWithTokenPaymaster = {
  sender: walletAddress,
  nonce: 0n,
  initCode,
  callData,
  callGasLimit: 100000n,
  verificationGasLimit: 100000n,
  preVerificationGas: 50000n,
  maxFeePerGas: 1000n,
  maxPriorityFeePerGas: 10000n,
  paymasterAndData,
  signature: '0x',
}
```

### Notes

- token destination addresses inside the batch must be strictly ordered
- approval amount must be high enough
- `callGasLimit` must be large enough for the approval batch
- this rule is specific to the current TokenPaymaster implementation in this repository

## 7. Common mistakes

- using TokenPaymaster with an unsupported token
- forgetting token approval
- setting approval lower than the actual required token charge
- building `paymasterAndData` with the wrong encoding
- using a non-batch call structure during first wallet activation
- assuming SponsorPaymaster and TokenPaymaster use the same data format

## 8. Related documents

- `contract-api.md`
- `cases-userop.md`
- `troubleshooting.md`
