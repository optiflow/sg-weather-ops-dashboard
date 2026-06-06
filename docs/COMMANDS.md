# Common Commands

Run all commands from the **root directory**.

## Development & Build

- `npm run dev`: Starts the development server (orchestrates frontend and backend via `scripts/dev.mjs`).
- `npm run build`: Builds both frontend and backend workspaces.
- `npm run start`: Starts the production server.
- `npm run docs`: Starts the Astro Starlight documentation site at `http://localhost:4321`.
- `npm run docs:build`: Builds the Astro Starlight documentation site.
- `npm run docs:check`: Checks local Markdown/MDX links and validates `.devin/wiki.json` shape.

## Testing & Quality

- `npm test` or `npm run test:watch`: Runs Vitest test suite.
- `npm run test:e2e`: Runs the Playwright smoke test.
- `npm run lint`: Checks linting and formatting with Biome.
- `npm run lint:ci`: Runs Biome's CI check.
- `npm run format`: Formats the codebase with Biome.
- `npx playwright install`: Installs browser binaries required by Playwright.
- `npx --no-install lefthook validate`: Validates the Git hook configuration.

Before finishing code or documentation changes, run the core project quality gate from the root:

```bash
npm test
npm run build
npm run docs:build
npm run docs:check
npm run lint
```

Run `npm run test:e2e` for browser-facing changes. It also runs in CI and the Lefthook `pre-push` hook.

For hook smoke tests, force Lefthook to run even when no files are staged:

```bash
npx --no-install lefthook validate
npx --no-install lefthook run pre-commit --force --no-auto-install
npx --no-install lefthook run pre-push --force --no-auto-install
```

On a fresh clone, run `npx playwright install` before expecting `npm run test:e2e` or the Lefthook `pre-push` hook to pass locally.

In sandboxed agent environments, `npm test` and `npm run test:e2e` may need permission to bind a local port. If either command fails with `listen EPERM`, rerun the same command with the required permission.

## Database Operations

- `npm run db:generate`: Generates Drizzle migrations.
- `npm run db:migrate`: Runs pending migrations.

## Troubleshooting

- `npm run reset`: Cleans local state such as the SQLite database.
- `npm run doctor`: Checks `/health` and `/api/locations` against `SG_WEATHER_OPS_URL` when set; otherwise it tries the Portless URL (`http://sg-weather-ops-dashboard.localhost:1355` by default) and then the direct Express URL (`http://127.0.0.1:3000` by default).
