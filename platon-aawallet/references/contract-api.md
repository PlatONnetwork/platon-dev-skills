# Contract API

This document describes the main contract interfaces that third-party integrators need to know when using this wallet system.

It is not a full ABI reference. It focuses on the methods that matter for wallet creation, `UserOperation` submission, paymaster integration, and troubleshooting.

## 1. BaseWallet

Source:
- `src/wallet/BaseWallet.sol`

### 1.1 `setup`

**Signature**

```solidity
function setup(
    IEntryPoint _aaEntryPoint,
    address[] calldata _owners,
    uint256 _threshold,
    address _to,
    bytes calldata _data,
    address _fallbackHandler,
    uint256 _lockPeriod
) external
```

**Purpose**

Initialize a wallet proxy instance.

**Key parameters**

- `_aaEntryPoint`: EntryPoint address used by the wallet
- `_owners`: wallet owner list
- `_threshold`: required signature threshold
- `_to`: optional delegatecall target during setup
- `_data`: optional delegatecall payload during setup
- `_fallbackHandler`: optional fallback handler
- `_lockPeriod`: wallet lock period

**Integration notes**

- this should only be called once
- the exact encoded initializer affects the counterfactual wallet address
- the same initializer must be used for both address prediction and actual deployment
- during setup, the wallet enables EntryPoint as a module

### 1.2 `entryPoint`

**Signature**

```solidity
function entryPoint() public view returns (IEntryPoint)
```

**Purpose**

Return the wallet's configured EntryPoint address.

### 1.3 `nonce`

**Signature**

```solidity
function nonce() public view returns (uint256)
```

**Purpose**

Return the wallet nonce used during `UserOperation` validation.

**Integration notes**

- read this before building a request for an already deployed wallet

### 1.4 `execute`

**Signature**

```solidity
function execute(
    address target,
    uint256 value,
    bytes memory data,
    Enum.Operation operation
) external
```

**Purpose**

Execute a call or delegatecall from the wallet.

**Integration notes**

- this method is protected by wallet self-call restrictions
- in ERC-4337 flows in this repository, external integrators typically do not place this call directly at the top level of `userOp.callData`
- instead, the tested execution path wraps `BaseWallet.execute(...)` inside module calls such as `ModuleManager.executeFromModule(...)`
- this works because the wallet enables EntryPoint as a module during setup

### 1.5 `validateUserOp`

**Signature**

```solidity
function validateUserOp(
    UserOperation calldata userOp,
    bytes32 userOpHash,
    uint256 missingAccountFunds
) external returns (uint256)
```

**Purpose**

Validate the `UserOperation` from EntryPoint.

**Integration notes**

- third-party integrators usually do not call this directly
- failures here often appear during simulation or `handleOps`

### 1.6 `isValidSignature`

**Signature**

```solidity
function isValidSignature(bytes32 hash, bytes memory signature)
    external
    view
    returns (bytes4)
```

**Purpose**

Validate a signature using ERC-1271 semantics.

### 1.7 Signature behavior

**Purpose**

Describe the repository-specific signature validation behavior relevant to third-party integrations.

**Integration notes**

- this repository does not use a purely generic `UserOperation` signature format
- the wallet validates signatures according to project-specific packing rules
- multi-owner signatures must respect owner ordering expectations
- signatures are expected to align with the repository's signature mode model

**Practical implication**

Do not assume that signing `userOpHash` directly with one EOA and placing that raw signature into `userOp.signature` is sufficient.

This signature behavior should be treated as a language-agnostic protocol rule.
Any implementation in Go, Rust, Java, Python, or TypeScript must reproduce the same hash derivation, byte packing, owner ordering, and final `userOp.signature` layout.

## 2. WalletProxyFactory

Source:
- `src/wallet/WalletProxyFactory.sol`

### 2.1 `createWallet`

**Signature**

```solidity
function createWallet(
    address _implementation,
    bytes memory _initializer,
    bytes32 _salt
) external returns (address)
```

**Purpose**

Deploy a wallet proxy and optionally initialize it.

**Integration notes**

- `_implementation` must point to the deployed wallet logic
- `_initializer` is usually the encoded `BaseWallet.setup(...)`
- any mismatch in `_initializer` or `_salt` changes the resulting address

### 2.2 `getWalletAddress`

**Signature**

```solidity
function getWalletAddress(
    address _implementation,
    bytes memory _initializer,
    bytes32 _salt
) external view returns (address)
```

**Purpose**

Predict the wallet address before deployment.

**Integration notes**

- use the exact same parameters later when calling `createWallet(...)`

## 3. EntryPoint

Source:
- `src/modules/EntryPoint.sol`

### 3.1 `handleOps`

**Signature**

```solidity
function handleOps(
    UserOperation[] calldata ops,
    address payable beneficiary
) public
```

**Purpose**

Execute one or more `UserOperation` items.

**Integration notes**

- this is the main execution entry for ERC-4337 flows
- the wallet may be created during this call if `initCode` is provided

### 3.2 `getUserOpHash`

**Purpose**

Return the hash used as the input to the repository's signing flow.

**Integration notes**

- the final signature format must still follow the repository's project-specific encoding rules

## 4. TokenPaymaster

Source:
- `src/paymaster/TokenPaymaster.sol`

### 4.1 `paymasterAndData` format

In the current repository version, `paymasterAndData` is interpreted as:

- first 20 bytes: paymaster address
- remaining bytes: ABI-encoded `(address token, uint256 maxCost)`

### 4.2 Integration requirements

Third-party integrators must verify:

- the selected token is supported
- the wallet balance is sufficient
- allowance is sufficient when the wallet is already deployed
- `maxCost` includes sufficient safety margin
- the paymaster is funded and staked on-chain

### 4.3 First-creation special rules

If the wallet is being created in the same `UserOperation` and `initCode` is not empty, TokenPaymaster applies extra constraints:

- the factory extracted from `initCode` must match the configured wallet factory
- `userOp.callData` must be `executeBatchFromModule(bytes[])`
- each batch item must encode `BaseWallet.execute(...)`
- the batch must contain token `approve(...)` calls to the TokenPaymaster
- destination token addresses must be strictly ordered

## 5. SponsorPaymaster

Source:
- `src/paymaster/SponsorPaymaster.sol`

### 5.1 Integration behavior

In the current repository version, SponsorPaymaster primarily validates whether it can cover required prefund and deposit behavior from its own available funds.

### 5.2 Integration notes

- the current contract code does not show a complex custom `paymasterAndData` authorization format similar to backend-issued sponsor signatures
- if a deployment environment adds off-chain sponsor approval policy, that logic should be documented separately by the project owner
- third-party integrators should not assume hidden sponsor-side authorization data unless their environment explicitly requires it

## 6. Related documents

- `signature-model.md`
- `cases-create-wallet.md`
- `cases-userop.md`
- `cases-paymaster.md`
- `troubleshooting.md`
