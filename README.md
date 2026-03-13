# PlatON Dev Skills

This repository stores canonical reusable skills for PlatON development workflows.

## Skills

- `platon-chainlist`: resolve validated PlatON mainnet and devnet Chainlist endpoints
- `platon-cli`: query PlatON on-chain data with Foundry `cast`

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
├── platon-chainlist/
├── platon-cli/
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
