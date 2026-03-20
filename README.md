# PlatON Dev Skills

This repository stores canonical reusable skills for PlatON development workflows.

## Skills

- `platon-chainlist`: resolve validated PlatON mainnet and devnet Chainlist endpoints
- `platon-cli`: query PlatON on-chain data with Foundry `cast`
- `platon-blockscout`: query PlatON explorer data from Blockscout
- `platon-crosschain`: query PlatON bridge routes, bridge transactions, and crosschain contract guidance
- `platon-aawallet`: integrate PlatON AA wallet ERC-4337 contracts from any language or SDK

Current `platon-blockscout` coverage includes:

- verified contract ABI and source inspection
- address overview, token holdings, NFT collections
- block details, transaction details, transaction logs
- address-emitted logs
- filtered transaction history and token transfer history

Suggested skill boundary:

- use `platon-chainlist` for validated RPC and explorer endpoint discovery
- use `platon-cli` for direct RPC reads and writes
- use `platon-blockscout` for explorer-style indexed data and verified-contract metadata
- use `platon-crosschain` for bridge route discovery, bridge transaction lookup, and crosschain bridge guidance
- use `platon-aawallet` for PlatON AA wallet ERC-4337 integration flows across languages and SDKs

Each skill follows the shared open skill contract:

- skill directory with a `SKILL.md` entry file
- optional `agents/` metadata
- optional bundled `references/`, `scripts/`, or `assets/`

## Repository Layout

```text
.
├── .claude-plugin/
│   └── marketplace.json
├── AGENTS.md
├── platon-blockscout/
├── platon-chainlist/
├── platon-cli/
├── platon-crosschain/
├── platon-aawallet/
└── README.md
```

## Installation

Generic installer form:

```bash
npx skills add PlatONnetwork/platon-dev-skills
```

For this repository, use the repository path or URL supported by your installer.

Claude Code marketplace form:

```bash
claude plugin marketplace add PlatONnetwork/platon-dev-skills
```

After adding the marketplace, install the published plugin entry you want from this repository.


## Design Rules

- Keep `SKILL.md` focused on runtime behavior, not installation steps
- Keep agent-specific metadata outside the core workflow where possible
- Keep detailed domain material in bundled references instead of bloating `SKILL.md`
- Treat marketplace or installer files as compatibility layers, not the skill itself
