# Signature Model

This document explains the repository-specific signature behavior that third-party integrators must follow when building `UserOperation` requests.

This is the most important place where generic ERC-4337 examples are likely to be wrong for this repository.

## 1. Core rule

Do not assume the wallet accepts a plain raw signature over `userOpHash`.

In this repository, the tested signing flow is:

1. build the final `UserOperation`
2. read `userOpHash` from `EntryPoint`
3. derive a repository-specific signing hash from:
- `userOpHash`
- `SignatureMode`
- `validationData`
4. sign that derived hash
5. concatenate signatures in ascending owner-address order
6. wrap the result into the repository's packed signature format

This flow must be implementable without any TypeScript helper library. Treat the rules below as protocol rules, not SDK usage notes.

## 2. Signature mode

The repository defines these modes:

- `SignatureMode.owner`
- `SignatureMode.guardians`
- `SignatureMode.session`

For normal owner-controlled wallet actions, the relevant mode is `SignatureMode.owner`.

## 3. Derived signing hash

The repository test flow derives the signing hash from:

```solidity
keccak256(abi.encodePacked(userOpHash, mode, validationData))
```

From a third-party integration perspective, this means:

- `userOpHash` is not yet the final thing to sign
- the wallet expects a mode-aware derived hash
- changing mode or validation data changes the signing hash

## 4. Packed signature format

The repository uses a packed signature wrapper rather than placing raw concatenated signatures directly into `userOp.signature`.

At a high level, the packed structure contains:

- version
- data type
- optional validation data
- concatenated signature bytes

The current repository version uses version `0` in test flows.

## 4.1 Exact byte layout for the normal owner flow

For the owner flow used by repository tests, `userOp.signature` is encoded as:

```text
offset  size  meaning
0       1     version
1       1     dataType
2       32    signatureLength as uint256 big-endian
34      N     concatenated signatures
```

For the tested owner flow:

- `version = 0x00`
- `mode = SignatureMode.owner = 0`
- `validationData = 0`
- `modeBit = 0`
- `dataType = (mode << 1) | modeBit = 0x00`

So the byte prefix is:

```text
0x00 0x00
```

followed by:

- a 32-byte `uint256` signature length
- the concatenated `r || s || v` signature bytes

## 5. Validation data

The signature wrapper may include `validationData`.

In the tested owner flow used by this repository:

- `validationData = 0`
- the signature mode is `owner`

If a future integration uses guardians, sessions, validity windows, or aggregators, the wrapper content may differ.

## 5.2 Validation data bit layout

`validationData` follows the standard packed ERC-4337 style used by this repository:

```text
bits   meaning
0-159  aggregator address
160-207 validUntil (48 bits)
208-255 validAfter (48 bits)
```

For the tested owner flow:

- aggregator = `address(0)`
- validUntil = `0`
- validAfter = `0`
- therefore `validationData = 0`

## 5.1 Exact owner flow used by repository tests

For the normal owner-controlled flow used in repository tests:

- `version = 0`
- `mode = SignatureMode.owner = 0`
- `validationData = 0`
- `dataType = (mode << 1) | modeBit`
- because `validationData = 0`, `modeBit = 0`
- therefore `dataType = 0`

The signing hash is:

```solidity
keccak256(abi.encodePacked(userOpHash, uint8(0), uint256(0)))
```

Language-agnostic implementation steps:

1. obtain `userOpHash` from `EntryPoint.getUserOpHash(userOp)`
2. encode `mode` as a single byte for the hash input
3. encode `validationData` as a 32-byte `uint256`
4. compute `signHash = keccak256(userOpHash || mode || validationData)`
5. sign `signHash` directly with raw secp256k1 digest signing
6. serialize each signature as `r || s || v`
7. sort by owner address ascending before concatenation
8. prepend `version`, `dataType`, and the 32-byte signature length

The packed `userOp.signature` bytes are:

```text
bytes1(version=0x00)
+ bytes1(dataType=0x00)
+ uint256(signatureLength)
+ concatenatedSignatures
```

For a single owner, `concatenatedSignatures` is just one `r || s || v` segment.

For multiple owners, `concatenatedSignatures` is the ordered concatenation of all `r || s || v` segments.

## 5.3 Signing requirements independent of language

Any implementation language is acceptable as long as it can do all of the following exactly:

- ABI-pack or byte-pack the signing input in the required order
- compute Keccak-256
- produce raw secp256k1 signatures over a digest, not an EIP-191 personal-sign message
- serialize signatures as `r || s || v`
- sort owners by address before concatenation

If a language SDK defaults to `personal_sign`, `signMessage`, or any EIP-191 prefixing flow, do not use that API as the production signing path.

## 6. Owner ordering

When multiple owners sign, signatures must be concatenated in ascending owner-address order.

This is not optional.

If signatures are individually correct but concatenated in the wrong order, validation can still fail.

## 7. Signature byte layout used for concatenated signatures

Each individual signature uses the standard compact ECDSA ordering:

- `r`
- `s`
- `v`

When multiple owners sign, the repository concatenates these `r || s || v` segments in ascending owner-address order before wrapping them into the packed signature format.

Practical note:

- `r` is 32 bytes
- `s` is 32 bytes
- `v` is 1 byte
- each owner contributes exactly 65 bytes in the normal EOA owner flow

## 8. Practical integration guidance

When documenting or implementing signing for this repository:

- treat signing as repository-specific logic
- do not collapse it into a generic `walletClient.signMessage({ raw: userOpHash })` example
- do not use EIP-191 message signing as the final production signature path
- if you show a conceptual signing snippet, label it clearly as incomplete for production use
- keep owner sorting and signature packing explicit in the flow

### Minimal `viem` owner-flow example

The repository tests sign the derived digest directly. In `viem`, prefer a raw hash signing API such as the local account's `sign({ hash })`, not `signMessage(...)`.

```ts
import { concatHex, encodePacked, hexToBytes, keccak256, numberToHex, size } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const OWNER_MODE = 0
const VALIDATION_DATA = 0n
const VERSION = '0x00'
const DATA_TYPE = '0x00' // owner mode with validationData = 0

function packOwnerSignature(params: {
  userOpHash: `0x${string}`
  signatures: readonly `0x${string}`[]
}) {
  const signHash = keccak256(
    encodePacked(
      ['bytes32', 'uint8', 'uint256'],
      [params.userOpHash, OWNER_MODE, VALIDATION_DATA],
    ),
  )

  return { signHash }
}

async function signSingleOwner(params: {
  privateKey: `0x${string}`
  userOpHash: `0x${string}`
}) {
  const account = privateKeyToAccount(params.privateKey)
  const { signHash } = packOwnerSignature({
    userOpHash: params.userOpHash,
    signatures: [],
  })

  // Raw digest signing. Do not replace this with signMessage(...)
  const sig = await account.sign({ hash: signHash })
  const sigLength = numberToHex(size(sig), { size: 32 })

  return concatHex([VERSION, DATA_TYPE, sigLength, sig])
}
```

Notes:

- `account.sign({ hash })` signs the digest directly
- `signMessage(...)` is not equivalent here
- for multi-owner flows, sort owner addresses ascending first, then concatenate their `r || s || v` signatures before wrapping
- if `validationData != 0`, the packed layout changes and must include the 32-byte validation value before the signature length

## 8.1 Language-agnostic pseudocode

```text
input:
  userOp
  mode = 0
  validationData = 0
  orderedOwners = owners sorted ascending by address

steps:
  1. userOpHash = EntryPoint.getUserOpHash(userOp)
  2. signHash = keccak256(
       userOpHash
       || uint8(mode)
       || uint256(validationData)
     )
  3. for each owner in orderedOwners:
       sig = secp256k1_sign_digest(signHash, owner.privateKey)
       encodedSig = sig.r || sig.s || sig.v
       append encodedSig
  4. finalSignature =
       bytes1(0x00)
       || bytes1(0x00)
       || uint256(len(concatenatedSignatures))
       || concatenatedSignatures
  5. set userOp.signature = finalSignature
```

## 9. Safe wording for the other case documents

When other documents mention signing, they should say:

- read `userOpHash`
- derive the repository signing hash
- sign with the required mode
- sort owners consistently
- pack signatures using the repository format

They should not say:

- sign `userOpHash` directly and place the result into `userOp.signature`
- use `signMessage({ raw: userOpHash })` as the final signature

## 10. Related documents

- `prerequisites.md`
- `contract-api.md`
- `cases-userop.md`
- `troubleshooting.md`
