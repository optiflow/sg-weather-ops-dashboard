---
name: drizzle-sqlite-migration
description: Change SG Weather Ops Dashboard SQLite persistence with Drizzle schema updates, migrations, database helpers, tests, and docs.
---

# Drizzle SQLite Migration

Use this skill when a task changes persisted data, SQLite tables, indexes, or Drizzle migrations.

## Workflow

1. Inspect the current data model:
   - `backend/src/schema.ts`
   - `backend/src/db.ts`
   - `backend/drizzle/*.sql`
   - `drizzle.config.ts`
2. Update `backend/src/schema.ts` first.
3. Update database helpers and row mapping in `backend/src/db.ts`.
4. Generate a migration from the repo root:
   - `npm run db:generate`
5. Apply and test the migration:
   - `npm run db:migrate`
   - `npm test`
6. Update API tests and docs for new fields or behavior.

## Testing Notes

- Route tests should set `DATABASE_PATH` to a temporary SQLite file before importing the server.
- Reset local state with `npm run reset` only when the user accepts losing the local development database.
- Do not edit generated migration snapshots manually unless Drizzle generation produced an invalid migration and the reason is documented.

## Schema Notes

- Keep JSON columns typed with `.$type<...>()`.
- Preserve `locations_latitude_longitude_unique` unless the product requirement changes duplicate-location behavior.
- Prefer new tables for append-only history rather than overloading the current `locations` snapshot columns.
