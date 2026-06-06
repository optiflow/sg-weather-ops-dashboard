---
name: sg-weather-ops-dashboard-agent
description: Agent operating contract for the SG Weather Ops Dashboard repository
ver: 31052026
---

# AGENTS.md

## Purpose

SG Weather Ops Dashboard is a Singapore weather app built as an npm workspaces monorepo. The frontend is a React/Vite/Tailwind dashboard with Leaflet maps. The backend is a Node.js/Express API with SQLite persistence through Drizzle ORM and Pino logging. The docs workspace is an Astro Starlight site.

This file is the agent-facing operating contract. Keep user-facing onboarding in `README.md` and detailed reference material in `docs/`.

## Operating Principles

- State assumptions before changing behavior. If a request has multiple plausible meanings, name the tradeoff and ask when the choice is material.
- Prefer the smallest implementation that satisfies the request. Do not add speculative features, abstractions, configuration, or error handling.
- Keep changes surgical. Touch only files required for the task and remove only unused code introduced by the current change.
- Match existing style and architecture, even when another style is possible.
- Turn work into verifiable success criteria before implementation. For bugs, reproduce or cover the behavior before claiming it is fixed.
- Verify before reporting completion. Never claim a command passed unless it was run.
- Structure reasoning and status clearly: start with the main point, then supporting details. Be objective and explicit about uncertainty.

## Read First

Read only the references needed for the task:

- `README.md` - human onboarding and high-level project map.
- `docs/ARCHITECTURE.md` - workspace layout and runtime architecture.
- `docs/COMMANDS.md` - canonical root commands and quality gate.
- `docs/TYPESCRIPT.md` - TypeScript conventions.
- `docs/THEMES.md` - visual and theme guidance for styling changes.
- `docs/src/content/docs/reference/api-endpoints.md` - API behavior and response contracts.
- `docs/src/content/docs/reference/database-schema.md` - database schema and Drizzle mapping.
- `llms.txt` - curated orientation guide for LLM and agent readers.
- Relevant skill files under `.agents/skills/` when the task matches their description.

Treat local files as the source of truth before editing or making final claims.

## Project Constraints

- Use npm workspaces from the repository root. Do not introduce another package manager or ignore `package-lock.json`.
- Use Biome 2.4.16 as the linter and formatter: `npm run lint`, `npm run format`.
- Keep TypeScript strict in both workspaces.
- Backend imports use NodeNext rules with `.js` extensions for local emitted modules.
- Frontend imports use Vite/Bundler resolution.
- Use Drizzle ORM for SQLite persistence. Database schema changes require migrations, tests, and docs.
- Keep shared contracts in dedicated type files when they cross module boundaries.
- Frontend changes must preserve responsive layout, accessibility, and existing visual conventions.
- Backend changes must validate inputs, keep route logic testable, and avoid logging raw secrets or sensitive coordinates beyond what the app already needs.

## Setup

Run from the repository root:

```bash
npm install
npm run dev
```

Environment setup is documented in `docs/src/content/docs/reference/configuration.md`. The app works without `WEATHER_API_KEY` for light local usage. Use `.env` and `.env.local` files only for local configuration; never print or commit their contents.

`CLAUDE.md` is a compatibility symlink to `AGENTS.md` for tools that read that file.

## Canonical Commands

Run commands from the repository root.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Express and Vite middleware through Portless. |
| `npm run start` | Run the compiled production server. |
| `npm run docs` | Start the Astro Starlight docs site at `http://localhost:4321`. |
| `npm test` | Run Vitest and Supertest tests. |
| `npm run test:e2e` | Run the Playwright smoke test. |
| `npm run test:watch` | Run tests in watch mode. |
| `npm run build` | Build frontend and compile backend TypeScript. |
| `npm run docs:build` | Build the Astro Starlight docs site. |
| `npm run lint` | Run Biome checks. |
| `npm run format` | Format with Biome. |
| `npm run db:generate` | Generate Drizzle migrations. |
| `npm run db:migrate` | Apply Drizzle migrations. |
| `npm run reset` | Reset local state. |
| `npm run doctor` | Run local diagnostics. |

Required core quality gate before completing code or documentation changes when feasible:

```bash
npm test
npm run build
npm run docs:build
npm run lint
```

For browser-facing changes or reviewer handoff, also run `npm run test:e2e`. CI already runs the full gate: tests, app build, docs build, lint, and Playwright smoke. Do not change workflow behavior unless the task explicitly asks for it.

If `npm test` or `npm run test:e2e` fails with `listen EPERM` in a sandbox, rerun the same command with the required permission instead of treating it as an application failure.

## Working Contract

For every task:

1. Identify the smallest scope that satisfies the request.
2. Inspect existing code, tests, docs, and skills before changing behavior.
3. Prefer existing patterns over new abstractions.
4. Keep edits inside the relevant workspace and ownership boundary.
5. Update or add tests when behavior changes.
6. Check `docs/` and update it when behavior, commands, architecture, data shape, public API shape, or conventions change.
7. Run the smallest useful check while iterating and the full quality gate before finalizing when feasible.
8. Report what changed, what was verified, and any checks not run.

Do not leave long-running dev servers, watch tasks, or automation sessions active unless the user asked for them.

## Permissions

Allowed without prompting:

- Read and edit files inside this repository for the active task.
- Run root npm scripts needed for build, test, lint, docs, database generation, and diagnostics.
- Add focused tests and documentation that directly support the change.
- Use existing local skills when they match the task.

Require approval first:

- Adding, removing, or upgrading dependencies.
- Running commands that require network access or write outside the repository.
- Creating, deleting, or rewriting database migrations.
- Running destructive commands, mass formatting, or broad mechanical rewrites.
- Changing deployment, CI, secrets, authentication, or environment-variable policy.
- Browser automation against non-local or untrusted URLs.
- Editing protected policy/config areas such as `.agents/` or `.codex/`, unless the user explicitly requested that work.

Forbidden:

- Commit, print, log, or store secrets, tokens, cookies, private keys, or `.env` contents.
- Disable tests, lint rules, type checks, logging, or validation just to hide a failure.
- Change package managers or ignore the root lockfile.
- Claim checks passed without running them.
- Overwrite user changes or revert unrelated work.
- Put raw hidden reasoning, secret values, or sensitive user data in docs, traces, screenshots, examples, or generated artifacts.

## Testing And Verification

Match verification to the risk and surface area:

- Pure logic: focused unit tests.
- Express routes or database behavior: route and persistence tests.
- Weather API behavior: fixtures or controlled API-shape tests using `sg-weather-api`.
- Frontend behavior: Playwright smoke checks, component or integration checks, plus visual QA when layout, map behavior, or responsive UI changes.
- Documentation-only changes: verify links, commands, referenced paths, and run the quality gate when feasible.

Use `repo-quality-gate` before finishing code or documentation tasks unless the user explicitly narrows the request or local constraints prevent it.

## Documentation Rules

- Keep `README.md` human-facing and concise.
- Keep `AGENTS.md` agent-facing and policy-oriented.
- Keep detailed workflows, architecture, API contracts, database schema, and command reference in `docs/`.
- Update docs when behavior, commands, architecture, environment setup, database shape, public API shape, or conventions change.
- Do not duplicate long procedures in `AGENTS.md`; link to docs or skills.
- When changing this file, keep the skills and sub-agent inventory accurate.

## Skills Inventory

Use skills when the task clearly matches their description. Read only the needed sections and direct references.

| Skill | Use when |
| --- | --- |
| `.agents/skills/repo-quality-gate/SKILL.md` | Running final verification after code or documentation changes. |
| `.agents/skills/weather-feature-workflow/SKILL.md` | Implementing feature work across backend, weather data, React state, and dashboard components. |
| `.agents/skills/drizzle-sqlite-migration/SKILL.md` | Changing SQLite persistence, Drizzle schema, migrations, or database helpers. |
| `.agents/skills/frontend-visual-qa/SKILL.md` | Verifying frontend layout, theme behavior, responsive UI, or Leaflet map changes. |
| `.agents/skills/sg-weather-api/SKILL.md` | Working with Singapore data.gov.sg weather endpoints or response shapes. |
| `.agents/skills/chrome-devtools/SKILL.md` | Inspecting the local app in-browser or taking screenshots. |
| `.agents/skills/create-skill/SKILL.md` | Creating a new reusable project skill. |
| `.agents/skills/update-skill/SKILL.md` | Updating an existing project skill when a workflow changes. |
| `.agents/skills/grill-me/SKILL.md` | Interviewing for product or plan clarity before implementation. |
| `.agents/skills/to-prd/SKILL.md` | Turning a settled conversation into a product requirements document. |

## Skills And Sub-Agents

Create a new skill when one of these is true:

- A task is repeated more than twice.
- A workflow has more than three ordered steps.
- A reusable project pattern is too detailed for this file.

Store project skills at:

```text
.agents/skills/<skill-name>/SKILL.md
```

Use lowercase hyphenated skill names. Name the task, not the implementation tool. Include accurate `name` and `description` YAML frontmatter.

Create or update a sub-agent definition only when the project needs a reusable role with dedicated review behavior, constraints, and responsibilities. A linear repeatable workflow belongs in a skill.

Store project sub-agents at:

```text
.agents/<sub-agent-name>/agent.md
```

The current project code-review sub-agent is `.agents/code-review/agent.md`.

## Error Handling And Retries

- Classify failures as validation, environment, dependency, tool, policy, or transient external errors.
- Stop on validation failures, policy conflicts, missing secrets, destructive ambiguity, or unclear ownership.
- Retry only idempotent or clearly safe steps.
- Use at most three attempts with backoff for transient external failures.
- Do not retry destructive commands, migrations, deployments, or form-submitting browser actions without explicit approval.

## External Code Index

- DeepWiki index: https://deepwiki.com/optiflow/sg-weather-ops-dashboard
- Use DeepWiki for broad orientation only when network or MCP access is available.
- Local files remain the source of truth before edits and final claims.
