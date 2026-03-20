---
name: platon-aawallet
description: Guide for third-party integrators to use this repository's ERC-4337 AA wallet contracts from any language or SDK, including wallet creation, address prediction, UserOperation construction, paymaster integration, signature packing, and troubleshooting.
---

# PlatON AAWallet Integration

Use this skill when the user wants to integrate an external service, dApp, or backend with the wallet contracts in this repository.

This skill is for third-party integration, not for contract development, protocol design, or contract deployment authoring.

## What this skill covers

- Understanding the main contracts involved in third-party integration
- Preparing required chain and contract configuration
- Creating wallets or predicting wallet addresses
- Building `initCode` and `UserOperation` payloads in a language-agnostic way
- Integrating `SponsorPaymaster` or `TokenPaymaster`
- Troubleshooting common integration failures

## Main contracts

- `BaseWallet`: wallet implementation and signature validation entry
- `WalletProxyFactory`: wallet address prediction and wallet creation
- `EntryPoint`: ERC-4337 execution entry
- `TokenPaymaster`: token-based gas payment
- `SponsorPaymaster`: sponsor-funded gas payment

Read the project-specific interface details from:

- `references/overview.md`
- `references/contract-api.md`
- `references/signature-model.md`

## Workflow

1. Identify the user's goal:
- understand the architecture
- prepare integration config
- create or predict a wallet
- build `initCode`
- build `UserOperation`
- integrate a paymaster
- troubleshoot a failed request

2. Read only the relevant reference files:
- `references/overview.md`
- `references/prerequisites.md`
- `references/contract-api.md`
- `references/signature-model.md`
- `references/cases-create-wallet.md`
- `references/cases-userop.md`
- `references/cases-paymaster.md`
- `references/troubleshooting.md`

3. Answer using this structure when useful:
- goal
- prerequisites
- contract flow
- minimal `viem` example
- project-specific notes
- common mistakes

## Repository-specific rules

These rules are critical. Prefer them over generic ERC-4337 patterns.

### 1. Signature format is project-specific and must be described at byte level

Do not assume a plain raw signature over `userOpHash` is sufficient.

This repository uses:

- project-specific signature mode values
- project-specific signature packing
- derived signing hashes based on `userOpHash`
- ordered multi-owner signature concatenation

When describing signing, prefer the repository's signing model over generic `signMessage(userOpHash)` examples.
The explanation must be language-agnostic first, with byte layout, field order, and hash derivation explicit enough for Go, Rust, Java, or TypeScript implementations.

If a generic `viem` signing example is shown for orientation, clearly label it as conceptual and not the final production format.

For final code intended to run against this repository:

- do not set `userOp.signature` to a raw `signMessage({ raw: userOpHash })` result
- do not use an EIP-191 prefixed message signing flow as the production signature
- do use the repository's derived signing hash and packed signature wrapper
- do prefer the exact owner-flow details in `references/signature-model.md`

### 2. Standard execution path uses module-wrapped calls

In this repository, tested ERC-4337 execution flows typically do not use top-level `userOp.callData = BaseWallet.execute(...)`.

Instead, the normal path is:

1. encode `BaseWallet.execute(...)`
2. wrap it inside `ModuleManager.executeFromModule(...)`

This works because the wallet enables `EntryPoint` as a module during setup.

### 3. First wallet creation with TokenPaymaster has special constraints

If the wallet is being created in the same `UserOperation` and `TokenPaymaster` is used:

- `initCode` must point to the configured wallet factory flow
- `callData` must use `executeBatchFromModule(bytes[])`
- batch items must encode `BaseWallet.execute(...)`
- the flow must include token `approve(...)` for the paymaster

Do not describe first-activation token paymaster usage as a generic paymaster flow.

### 4. Owner ordering matters

When multiple owners sign:

- owner addresses must be handled consistently
- signatures must be concatenated in ascending owner-address order

Do not treat multi-owner signatures as unordered.

### 5. Counterfactual address inputs must match exactly

Wallet prediction and wallet creation must use the exact same:

- wallet logic address
- initializer bytes
- salt
- factory

Any difference in setup inputs such as owners, threshold, fallback handler, initializer target, initializer data, or lock period changes the derived wallet address.

### 6. Do not confuse factory address with wallet address

`WalletProxyFactory` and the deployed wallet instance are different contracts with different roles.

For final code:

- do not use `walletFactory` as `userOp.sender`
- do use the predicted wallet address or the already deployed wallet address as `sender`
- do verify wallet identity by reading wallet methods such as `entryPoint()`, `threshold()`, `owners(...)`, or `isOwner(...)` when troubleshooting

If those wallet reads revert, first suspect that the address is not a wallet instance.

### 7. For deployed wallets, prefer reading nonce from `BaseWallet.nonce()`

In this repository, deployed-wallet integrations should first read nonce from the wallet itself.

- do prefer `BaseWallet.nonce()` for an already deployed wallet
- only use `EntryPoint.getNonce(...)` when the target deployment is confirmed to expose and support that path
- do not silently fall back to `0` when nonce reads fail

### 8. Prefer protocol rules over SDK-specific examples

This skill may include `viem` examples for convenience, but those examples are not the actual contract interface specification.

For any topic that affects interoperability across languages, make sure the answer includes:

- exact field order
- exact hashing inputs
- exact byte layout
- ordering rules
- any repository-specific deviations from generic ERC-4337 assumptions

The goal is that an integrator using Go, Rust, Java, Python, or TypeScript can implement the flow directly from the skill without depending on `viem`.

## Constraints

- Prefer language-agnostic protocol descriptions first
- `viem` examples are optional convenience examples, not the primary specification
- Prefer examples specific to this repository's contracts
- Prefer scenario-driven answers over abstract API descriptions
- Do not give broad ERC-4337 explanations unless they are needed to explain this repository's behavior
- Do not present speculative paymaster or signature formats as confirmed behavior

## Output style

When possible, provide:

- the contract(s) involved
- required inputs
- exact order of operations
- a minimal `viem` example
- the main project-specific constraints
- the likely failure points

## Reference map

- architecture overview: `references/overview.md`
- required config and deployment inputs: `references/prerequisites.md`
- main contract interfaces: `references/contract-api.md`
- signature rules: `references/signature-model.md`
- wallet creation flows: `references/cases-create-wallet.md`
- user operation flows: `references/cases-userop.md`
- paymaster flows: `references/cases-paymaster.md`
- error diagnosis: `references/troubleshooting.md`
