---
name: repo-quality-gate
description: Run the SG Weather Ops Dashboard final verification workflow after code changes, including tests, build, lint, and docs review from the repo root.
---

# Repo Quality Gate

Use this skill before finishing any code or documentation task in `sg-weather-ops-dashboard`.

## Workflow

Run commands from the repository root:

1. `npm test`
2. `npm run build`
3. `npm run docs:build`
4. `npm run lint`
5. Review `/docs` for files affected by the change and update them when behavior, commands, architecture, or conventions changed.

## Notes

- The Vitest API tests use Supertest and may need permission to bind a local port in sandboxed environments. If `npm test` fails with `listen EPERM`, rerun it with escalation rather than treating it as an app failure.
- Keep verification output concise in the final response: report pass/fail for each check and call out anything not run.
- Do not run workspace commands from `frontend/` or `backend/` unless a task specifically requires a workspace-local command.
