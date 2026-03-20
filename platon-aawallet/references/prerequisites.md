# Integration Prerequisites

This document lists the inputs that a third-party integrator should prepare before using this repository's wallet contracts.

The goal is to reduce integration mistakes before wallet prediction, wallet creation, or `UserOperation` construction begins.

## 1. Required chain configuration

Prepare the following values for the target network:

- `chainId`
- `rpcUrl`
- native token symbol
- block explorer URL if available

Example:

```ts
export const chainConfig = {
  chainId: 210425,
  rpcUrl: 'https://your-rpc-url',
  explorer: 'https://your-explorer-url',
} as const
```

## 2. Required deployed contract addresses

Prepare the addresses actually deployed on the target network:

- `entryPoint`
- `walletLogic`
- `walletFactory`
- `tokenPaymaster`
- `sponsorPaymaster`
- `fallbackHandler` if one is used

Current known AA wallet contract addresses are:

### Dev/Test Network

- `BASE_WALLET_IMPLEMENT_ADDRESS`: `0x0B3A9aBF7989ad792cb8709fEA5E9a969797B204`
- `WALLET_PROXY_FACTORY_IMPLEMENT_ADDRESS`: `0x0d3c08dB1F052Df29980A2B3339bBf428b372B28`
- `ENTRYPOINT_IMPLEMENT_ADDRESS`: `0x51D6e9f188ad2bC3977Bc7Fbb16a49f376b439a6`
- `ENTRYPOINT_PROXY_ADDRESS`: `0x427852Ac1285d8c5b7361491670B3bCeADD357FD`
- `ENTRYPOINT_NAME`: `TopWallet EntryPoint V1`
- `UNSTAKE_DELAY_SEC`: `86400000`
- `MIN_STAKE_VALUE`: `100000`
- `SPONSOR_PAYMASTER_IMPLEMENT_ADDRESS`: `0x103B9A1e70C20482411868972819F1E4C5cc0a98`
- `SPONSOR_PAYMASTER_PROXY_ADDRESS`: `0x152Abfc247C8d9a8450A00Fb6479B54981093500`
- `SPONSOR_PAYMASTER_MIN_DEPOSIT_THRESHOLD`: `1000000000000000000`

### Mainnet

- `BASE_WALLET_IMPLEMENT_ADDRESS`: `0x518a5BC2bB107B7A7121986A26De39ca4B03e4D1`
- `WALLET_PROXY_FACTORY_IMPLEMENT_ADDRESS`: `0x2Be54D91c8999186C1790765367c46c5E4dC760D`
- `ENTRYPOINT_IMPLEMENT_ADDRESS`: `0xD20E95Dd7c923dE1B96092Cf8Bd98e8DFD4055ce`
- `ENTRYPOINT_PROXY_ADDRESS`: `0x1714008c16E0eae04fF0D1A6F99B1f8780Ff95E0`
- `ENTRYPOINT_NAME`: `TopWallet EntryPoint V1`
- `UNSTAKE_DELAY_SEC`: `86400000`
- `MIN_STAKE_VALUE`: `100000`
- `SPONSOR_PAYMASTER_IMPLEMENT_ADDRESS`: `0xeAf89eFfAEb24783D54891B6debfd6A1f7caF6d6`
- `SPONSOR_PAYMASTER_PROXY_ADDRESS`: `0xeF3dc8F7Cece42d22660e787Da58aEDEA6133fF0`
- `SPONSOR_PAYMASTER_MIN_DEPOSIT_THRESHOLD`: `1000000000000000000`

Integration notes:

- `ENTRYPOINT_PROXY_ADDRESS` is the runtime `entryPoint` address to use in integration flows.
- `ENTRYPOINT_IMPLEMENT_ADDRESS` is for deployment verification or implementation inspection, not the runtime `userOp` target.
- `SPONSOR_PAYMASTER_PROXY_ADDRESS` is the paymaster address to use in live integration flows.
- `TokenPaymaster` and `fallbackHandler` addresses are not provided in this document and must be confirmed per deployment.

Example:

```ts
export const contracts = {
  entryPoint: '0x...',
  walletLogic: '0x...',
  walletFactory: '0x...',
  tokenPaymaster: '0x...',
  sponsorPaymaster: '0x...',
  fallbackHandler: '0x0000000000000000000000000000000000000000',
} as const
```

## 3. Required wallet initialization inputs

A third-party integrator must define the wallet initialization inputs before predicting or creating a wallet.

- `owners`
- `threshold`
- `salt`
- `initializerTarget`
- `initializerData`
- `fallbackHandler`
- `lockPeriod`

Example:

```ts
export const walletSetup = {
  owners: [
    '0x...',
    '0x...',
  ],
  threshold: 2,
  salt: '0x...',
  initializerTarget: '0x0000000000000000000000000000000000000000',
  initializerData: '0x',
  fallbackHandler: '0x0000000000000000000000000000000000000000',
  lockPeriod: 86400,
} as const
```

## 4. Required client capabilities

Before integrating, make sure your tooling can:

- read on-chain contract state
- build standard ABI-encoded contract calls
- submit transactions or bundle requests
- sign raw digests when the owner signature flow requires it

`viem` is one valid choice, but it is not required.

### viem example

```ts
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const account = privateKeyToAccount('0x...')

export const publicClient = createPublicClient({
  transport: http(chainConfig.rpcUrl),
})

export const walletClient = createWalletClient({
  account,
  transport: http(chainConfig.rpcUrl),
})
```

## 5. Required ERC-4337 inputs

Before building a `UserOperation`, confirm the integrator can obtain or compute:

- `sender`
- `nonce`
- `initCode`
- `callData`
- `callGasLimit`
- `verificationGasLimit`
- `preVerificationGas`
- `maxFeePerGas`
- `maxPriorityFeePerGas`
- `paymasterAndData`
- `signature`

## 6. Owner ordering and signature assumptions

This wallet does not treat multi-owner signatures as an unordered set.

Before building signatures, confirm:

- owner addresses are normalized consistently
- owner addresses are sorted in ascending address order
- concatenated signatures follow the same ascending owner order
- the signing mode matches the expected project mode

This repository uses project-specific signature packing. Do not assume a generic single-signature ERC-4337 flow is sufficient.

Relevant project concepts include:

- `SignatureMode.owner`
- `SignatureMode.guardians`
- `SignatureMode.session`

If the operation is signed by owners, the packed signature must follow the repository's expected encoding and ordering rules.

## 7. Required signing assumptions

The integrator must confirm the signing rules used by this wallet before implementing any `UserOperation` flow.

At minimum, verify:

- who is allowed to sign
- whether owner addresses must be sorted
- whether signatures must be concatenated in owner-address order
- whether the wallet signs `userOpHash` directly or a project-specific derived hash
- whether the signature must be wrapped in a custom encoded format
- whether threshold signing is required for the target wallet

Important:
This repository uses project-specific signature packing and validation rules. A generic `signMessage(userOpHash)` flow should not be assumed to work.

## 8. Required paymaster assumptions

If using a paymaster, confirm:

- whether `SponsorPaymaster` or `TokenPaymaster` is used
- whether the paymaster is already funded and staked
- whether the token is supported
- whether token allowance must be pre-approved
- how `paymasterAndData` should be encoded
- whether first-wallet-creation constraints apply

## 9. Pre-flight checklist

Before moving to wallet creation or `UserOperation` submission, verify:

- contract addresses are correct for the target chain
- the same initializer will be used in all wallet creation flows
- the same `salt` will be used in prediction and creation
- owner list and threshold are final
- owner addresses are ordered consistently
- the signer logic matches the wallet validation logic
- the sender address has enough prefund or paymaster support
- paymaster format assumptions match the deployed contracts

## 10. Related documents

- architecture overview: `overview.md`
- contract interfaces: `contract-api.md`
- signature rules: `signature-model.md`
- wallet creation flows: `cases-create-wallet.md`
- user operation flows: `cases-userop.md`
- paymaster flows: `cases-paymaster.md`
