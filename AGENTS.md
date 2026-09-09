# Repository Guidelines

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for `shizhi3620/shizhi3620.github.io`; use the `gh` CLI. Pull requests are not treated as an external request surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default labels `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository with a root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.

## Project Structure & Module Organization

- `qq-bot-message-probe/` contains the standalone Node.js 20+ QQ Bot WebSocket probe.
  - `src/probe.mjs` is the executable entry point.
  - `package.json` defines dependencies and local scripts.
  - `.env` is local-only configuration; never commit tokens or captured logs.
- `requirements/` is the product-requirements source of truth. `requirements/README.md` indexes active PRD baselines, and each `PRD-*.md` is a versioned specification.

Keep probe behavior changes within `qq-bot-message-probe/`. Do not combine unrelated product-scope and probe changes in one commit.

## Build, Test, and Development Commands

Run commands from `qq-bot-message-probe/`:

```bash
npm install       # Install the ws dependency.
npm run check     # Syntax-check src/probe.mjs.
npm start         # Connect to the configured QQ Bot gateway.
```

Before starting the probe, copy the supplied environment template if present and set `QQ_BOT_ACCESS_TOKEN` and `QQ_BOT_GATEWAY`. Use only a consented test group.

## Coding Style & Naming Conventions

Use ES modules and modern Node.js syntax. Follow the existing conventions: two-space indentation, double quotes, semicolons, and trailing commas in multiline literals. Use `camelCase` for variables and functions; event constants use `UPPER_SNAKE_CASE`, such as `GROUP_AND_C2C_EVENT`.

Keep live diagnostic output concise and useful. Never log access tokens, message content, or other sensitive configuration.

## Testing Guidelines

There is no automated test suite. Run `npm run check` for every code change. For gateway behavior changes, manually validate against a test bot and consented group. In review notes, record only expected event names and outcomes; do not include real messages or credentials.

## Requirements Documentation

Name requirement files `PRD-<number>-<topic>-v<major>.<minor>.<patch>.md`. When a PRD baseline changes, update its version history and the current-baseline table in `requirements/README.md`.

## Commits & Pull Requests

Use concise, imperative subjects, for example `Add gateway reconnect handling`. Keep pull requests focused, link the relevant PRD or issue, describe behavior and validation, and include only sanitized terminal output or screenshots when they help reviewers verify a user-visible change.
