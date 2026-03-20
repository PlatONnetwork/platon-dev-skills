# Overview

This document explains the main contracts that a third-party integrator interacts with when using this repository's ERC-4337 wallet system.

It is not a full architecture document. It focuses on the contract relationships that matter for wallet creation, UserOperation submission, and paymaster integration.

## 1. Main contracts

### BaseWallet

Source:
- `src/wallet/BaseWallet.sol`

Role:
- wallet logic contract
- validates signatures for `UserOperation`
- stores wallet owners, threshold, nonce, security state, and modules
- executes wallet actions through wallet-controlled execution paths

Third-party relevance:
- `setup(...)` defines the wallet initialization payload
- `nonce()` is needed for later `UserOperation` construction
- `execute(...)` is the core wallet action primitive

### WalletProxyFactory

Source:
- `src/wallet/WalletProxyFactory.sol`

Role:
- predicts counterfactual wallet addresses
- deploys wallet proxy instances

Third-party relevance:
- use `getWalletAddress(...)` to predict the wallet address
- use `createWallet(...)` to deploy directly
- use factory calldata to build `initCode` for first wallet activation

### EntryPoint

Source:
- `src/modules/EntryPoint.sol`

Role:
- ERC-4337 execution entry
- validates and executes `UserOperation`
- creates wallet accounts during execution when `initCode` is present

Third-party relevance:
- `handleOps(...)` is the main execution entry
- `getUserOpHash(...)` is needed to derive the signing hash

### TokenPaymaster

Source:
- `src/paymaster/TokenPaymaster.sol`

Role:
- allows gas payment with supported ERC20 tokens
- validates token-related paymaster inputs
- charges token funds after execution

Third-party relevance:
- requires supported token selection
- requires `paymasterAndData` in the repository's expected format
- has extra constraints for first wallet creation flows

### SponsorPaymaster

Source:
- `src/paymaster/SponsorPaymaster.sol`

Role:
- sponsors gas using its own available funds
- tracks sponsored and compensated balances internally

Third-party relevance:
- useful when the project wants gas sponsorship
- integration behavior is simpler than TokenPaymaster in the current repository version

## 2. Wallet lifecycle from a third-party perspective

The usual third-party integration flow is:

1. prepare deployed contract addresses and wallet setup inputs
2. encode `BaseWallet.setup(...)`
3. predict the wallet address through `WalletProxyFactory.getWalletAddress(...)`
4. either:
- deploy the wallet directly with `createWallet(...)`, or
- create it during the first `UserOperation` using `initCode`
5. build `userOp.callData`
6. compute `userOpHash`
7. sign using the repository's signature model
8. optionally attach paymaster data
9. submit through `EntryPoint.handleOps(...)`

## 3. Execution path used by this repository

The tested execution path in this repository is important.

For normal wallet actions, the flow is typically:

1. encode `BaseWallet.execute(...)`
2. wrap it inside `ModuleManager.executeFromModule(...)`
3. place that module call into `userOp.callData`

This matters because the wallet enables `EntryPoint` as a module during setup. Third-party integrators should not assume top-level direct `BaseWallet.execute(...)` is the standard path for this repository.

## 4. Signature model

This repository uses a project-specific signature model.

From a third-party integration perspective, this means:

- do not assume a raw signature over `userOpHash` is enough
- the signing flow derives another signing hash from `userOpHash`
- packed signature bytes must follow the repository's encoding rules
- multi-owner signatures must be concatenated in ascending owner-address order

This is one of the main areas where generic ERC-4337 examples are likely to be wrong for this project.

## 5. Paymaster model

This repository supports two different paymaster styles.

### TokenPaymaster

Use this when gas should be paid with a supported ERC20 token.

Important behavior:
- `paymasterAndData` format is project-specific
- supported token and allowance checks apply
- first wallet creation has special constraints

### SponsorPaymaster

Use this when gas should be paid by the sponsor contract itself.

Important behavior:
- current contract behavior mainly depends on sponsor funds and deposit state
- the current repository version does not show a complex custom sponsor authorization payload in contract validation

## 6. Most common integration tasks

Most third-party requests fall into one of these groups:

- prepare chain and contract configuration
- predict wallet address
- deploy or activate a wallet
- construct `UserOperation`
- build token paymaster requests
- troubleshoot validation or execution failures

Use the case documents for these flows:

- `cases-create-wallet.md`
- `cases-userop.md`
- `cases-paymaster.md`
- `troubleshooting.md`
