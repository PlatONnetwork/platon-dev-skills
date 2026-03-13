# Repository Guidance

This repository stores canonical PlatON skills.

## Scope

- Keep each skill self-contained in its own directory.
- Use `SKILL.md` as the runtime entry file for every skill.
- Keep agent-specific UI metadata in `agents/openai.yaml`.
- Keep Claude compatibility at the repository level under `.claude-plugin/`.

## Editing Rules

- Prefer concise `SKILL.md` files.
- Put large domain material in `references/`.
- Do not add installation walkthroughs inside individual `SKILL.md` files.
- When a skill is removed, also remove stale references from `README.md` and `.claude-plugin/marketplace.json`.

## Current Skills

- `platon-chainlist`
- `platon-cli`
