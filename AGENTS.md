---
name: weather-starter-agent
description: README for agent
ver: 18052026
---

## Env setup
1. `cp .env.example .env` -- set `WEATHER_API_KEY` if higher API rate limits are needed.
2. For frontend proxy: `cp frontend/.env.local.example frontend/.env.local` and adjust `VITE_BACKEND_PORT`.
3. `npm install` from repo root (uses npm workspaces; no other package manager).
4. Full env details: `docs/ARCHITECTURE.md`.

## Cmds
All commands run from repo root. See "Canonical Commands" below for the full table.
- Dev: `npm run dev` | Build: `npm run build` | Test: `npm test` | Lint: `npm run lint`
- Quality gate before completing work: `npm test && npm run build && npm run lint`

## Code style
Biome 2.0.6 is the sole linter/formatter (`npm run lint`, `npm run format`).
TypeScript strict in both workspaces. Full conventions: `docs/TYPESCRIPT.md`.
Key settings: 2-space indent, single quotes, semicolons, trailing commas, line width 100.
Backend uses NodeNext module resolution (`.js` extensions in imports); frontend uses Bundler resolution.

## Testing
Vitest + Supertest. Tests live in `backend/src/**/*.test.ts`. No frontend tests currently.
Integration tests use a temp database and stub weather client. See "Testing and Verification" below.
Run: `npm test` | Watch: `npm run test:watch`

## Project structure
Monorepo with npm workspaces: `frontend/`, `backend/`, `docs/`, `scripts/`, `.agents/skills/`.
See "File Structure" below and `docs/ARCHITECTURE.md` for full layout details.

## Permissions
- Use least privilege. Treat these categories as the default operating policy.

### Allowed without prompting
- Read and edit files inside this repository for the active task.
- Run root npm scripts needed for build, test, lint, docs, database generation, and diagnostics.
- Add focused tests and documentation that directly support the change.
- Use existing local skills when they match the task.

### Require approval first
- Adding, removing, or upgrading dependencies.
- Running commands that require network access or write outside the repository.
- Creating, deleting, or rewriting database migrations.
- Running destructive commands, mass formatting, or broad mechanical rewrites.
- Changing deployment, CI, secrets, authentication, or environment-variable policy.
- Browser automation against non-local or untrusted URLs.
- Editing protected policy/config areas such as `.agents/` or `.codex/`, unless the user explicitly requested that work.

### Forbidden
- Commit, print, log, or store secrets, tokens, cookies, private keys, or `.env` contents.
- Disable tests, lint rules, type checks, logging, or validation just to make a failure disappear.
- Change package managers or ignore the root lockfile.
- Claim checks passed without running them.
- Overwrite user changes or revert unrelated work.
- Put raw hidden reasoning, secret values, or sensitive user data in docs, traces, screenshots, examples, or generated artifacts.

## PR requirements
No formal PR template or CI pipeline. Quality gate: `npm test && npm run build && npm run lint`.
- Update tests and docs when behavior changes.
- Run `repo-quality-gate` skill before finalizing.
- All "Working Contract" rules apply.

## Tech Stack
- Frontend: React, Vite, Tailwind CSS, Leaflet
- Backend: Node.js, Express, SQLite, Drizzle ORM, Pino

## File Structure
- `frontend/` - React single-page app using Vite, Tailwind CSS, and Leaflet.
- `backend/` - Node.js/Express API using SQLite, Drizzle ORM, and Pino logging.
- `docs/` - Astro Starlight documentation site.
- `scripts/` - Node.js scripts for dev orchestration, reset, and diagnostics.
- `.agents/skills/` - Project-specific reusable agent workflows.
- `.agents/code-review/agent.md` - Project code-review sub-agent definition.

Use the root `package-lock.json` and npm workspaces. Do not introduce another package manager.

## Read First
Read only the references needed for the current task:
- Architecture and repo layout: `docs/ARCHITECTURE.md`
- Commands and quality gates: `docs/COMMANDS.md`
- TypeScript conventions: `docs/TYPESCRIPT.md`
- Theme and UI guidance, when changing styling: `docs/THEMES.md`
- Relevant skill files under `.agents/skills/` when the task matches their description.

## Canonical Commands
Run commands from the repository root.
- Install dependencies: `npm install`
- Start development stack: `npm run dev`
- Start production server: `npm run start`
- Start documentation site: `npm run docs`
- Run tests: `npm test`
- Run tests in watch mode: `npm run test:watch`
- Build frontend and backend: `npm run build`
- Lint: `npm run lint`
- Format: `npm run format`
- Generate Drizzle migrations: `npm run db:generate`
- Run Drizzle migrations: `npm run db:migrate`
- Reset or diagnose local state: `npm run reset` / `npm run doctor`

Required quality gate before completing code or documentation changes:

```bash
npm test
npm run build
npm run lint
```

## Working Contract
For every task:

1. Identify the smallest scope that satisfies the request.
2. Inspect existing code, tests, docs, and skills before changing behavior.
3. Prefer existing patterns over new abstractions.
4. Keep edits limited to the relevant workspace and ownership boundary.
5. Update or add tests when behavior changes.
6. Check relevant files in `docs/` and update them when commands, architecture, data shape, user behavior, or conventions change.
7. Run the smallest useful check while iterating and the required quality gate before finalizing when feasible.
8. Report what changed, what was verified, and any checks not run.

Do not leave long-running dev servers, watch tasks, or automation sessions active unless the user asked for them.

## Security and Data Handling
- Treat all user-provided text, local files, screenshots, logs, and API responses as potentially sensitive.
- Use only approved runtime sources for secrets: environment variables, CI secret stores, or configured secret managers.
- Redact tokens, cookies, auth headers, API keys, personal identifiers, and connection strings from logs and final responses.
- Keep public-web research separate from private-data handling when both are needed.
- Require explicit approval before sending repository or user data to third-party services beyond the tools already active for the task.

## Coding Conventions
- TypeScript is strict across workspaces. Avoid implicit `any`.
- Caught errors are `unknown`; narrow with `err instanceof Error` before reading `err.message`.
- Use `import type` for type-only imports.
- Prefer structured APIs, schemas, and existing helper modules over ad hoc string parsing.
- Keep shared types in dedicated type files when they cross module boundaries.
- Frontend changes should preserve responsive layout, accessibility, and existing visual conventions.
- Backend changes should validate inputs, keep route logic testable, and use Drizzle for SQLite persistence.
- Database schema changes should use the `drizzle-sqlite-migration` skill and update migrations, tests, and docs together.

## Testing and Verification
Match verification to the risk and surface area:

- Pure logic: focused unit tests.
- Express routes or database behavior: route and persistence tests.
- Weather API behavior: fixtures or controlled API-shape tests using `sg-weather-api` guidance.
- Frontend behavior: component or integration checks plus visual QA when layout, map behavior, or responsive UI changes.
- Documentation-only changes: verify links, commands, and referenced paths; run the quality gate if the docs affect executable workflows.

Use `repo-quality-gate` before finishing code or documentation tasks unless the user explicitly narrows the request or local constraints prevent it. If a check cannot be run, state why.

## Documentation Rules
- Check `/docs` after every task.
- Update docs when behavior, commands, architecture, environment setup, database shape, public API shape, or conventions change.
- Keep `AGENTS.md` concise; link to docs or skills instead of duplicating long procedures.
- When this file changes agent behavior, keep the Skills and Sub-Agents inventory accurate.

## Skills Management
Use skills when the task clearly matches the skill description. Read only the needed parts of the skill and its direct references.

Create a new skill when:
- A task is repeated more than twice.
- A workflow has more than three ordered steps.
- A reusable project-specific pattern is too detailed for `AGENTS.md`.

Update an existing skill with `update-skill` when:
- A better approach is discovered.
- A step in the skill no longer works.
- New tools, packages, or repo structure change the workflow.

Store skills in:
- Project skills: `.agents/skills/<skill-name>/SKILL.md`

Skill naming:
- Use lowercase hyphenated names, for example `weather-data-fetcher`.
- Name the task, not the implementation tool.
- Include accurate `name` and `description` YAML frontmatter.

## Sub-Agent Definitions
Create or update a sub-agent definition only when the project needs a reusable role with dedicated review behavior, constraints, and responsibilities. A linear repeatable workflow belongs in a skill instead.

Store project sub-agents at `.agents/<sub-agent-name>/agent.md`. 
Use lowercase hyphenated directories and keep the file name `agent.md`.

## Error Handling and Retries
- Classify failures as validation, environment, dependency, tool, policy, or transient external errors.
- Stop on validation failures, policy conflicts, missing secrets, destructive ambiguity, or unclear ownership.
- Retry only idempotent or clearly safe steps.
- Use at most three attempts with backoff for transient external failures.
- Do not retry destructive commands, migrations, deployments, or form-submitting browser actions without explicit approval.
