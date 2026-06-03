# Common Commands

Run all commands from the **root directory**.

## Development & Build

- `npm run dev`: Starts the development server (orchestrates frontend and backend via `scripts/dev.mjs`).
- `npm run build`: Builds both frontend and backend workspaces.
- `npm run start`: Starts the production server.
- `npm run docs`: Starts the Astro Starlight documentation site at `http://localhost:4321`.

## Testing & Quality

- `npm test` or `npm run test:watch`: Runs Vitest test suite.
- `npm run test:e2e`: Runs the Playwright smoke test.
- `npm run lint`: Checks linting and formatting with Biome.
- `npm run lint:ci`: Runs Biome's CI check.
- `npm run format`: Formats the codebase with Biome.
- `npx playwright install`: Installs browser binaries required by Playwright.
- `npx lefthook validate`: Validates the Git hook configuration.

Before finishing code changes, run the core project quality gate from the root:

```bash
npm test
npm run build
npm run lint
```

Run `npm run test:e2e` for browser-facing changes. It also runs in CI and the Lefthook `pre-push` hook.

In sandboxed agent environments, `npm test` and `npm run test:e2e` may need permission to bind a local port. If either command fails with `listen EPERM`, rerun the same command with the required permission.

## Database Operations

- `npm run db:generate`: Generates Drizzle migrations.
- `npm run db:migrate`: Runs pending migrations.

## Troubleshooting

- `npm run reset` / `npm run doctor`: Cleans or troubleshoots local state.
