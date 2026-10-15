# Prisma schema drift repair (2026-10-15)

## What was missing

Comparing `prisma/schema.prisma` with the full migration history
(`prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma`)
showed objects that the app uses but no migration creates:

| Object | Kind | Used by |
|---|---|---|
| `AiNoteJob.lockedAt`, `lockExpiresAt`, `lockedBy` | columns | `/api/ai-note/finalize` lease lock. Without them, every finalize call fails with Prisma P2022. |
| `AiNoteJob_noteId_idx`, `AiNoteJob_lockedBy_idx` | indexes | finalize lock queries |
| `PromoCodeType`, `PromoTargetPlan` | enums | promo codes |
| `PromoCode`, `PromoRedemption` | tables, plus 5 indexes and 2 foreign keys | `/api/billing/redeem`, `lib/promo/service.ts`, `scripts/*promo*` |
| `AiNoteJob.segmentTimeSec` default | 90 in the migrations, 300 in the schema | none: the app always sets the value |
| `StudySession.selectedQuizTypes` default | `ARRAY[]` in the migrations, none in the schema | none: the app always sets the value |

## The fix

- `prisma/migrations/20261015000000_repair_schema_drift/migration.sql` is idempotent and additive:
  - It uses `IF NOT EXISTS` and guarded `DO` blocks.
  - It does not drop, rename, or rewrite anything.
  - It does not touch any rows.
  - Foreign keys are added `NOT VALID`, so an orphaned row in an existing database cannot make the migration fail. New writes are still enforced.
- `schema.prisma`: `selectedQuizTypes` now declares `@default([])`, matching the migrations, instead of the migration dropping the default.

## Validation (disposable local PostgreSQL databases; dropped afterwards)

| Scenario | Result |
|---|---|
| A. Fresh database, `migrate deploy` of all 23 migrations | Applied; `migrate diff` against the schema reports no difference |
| B. Old history, then `db push` (production-like), plus data, then deploy the repair | Applied over existing objects; rows preserved; existing valid foreign keys untouched; lost default restored; no difference |
| C. Old history plus a hand-made partial state (some columns, one table without foreign keys, an orphaned row) | Applied; orphan kept; foreign keys added `NOT VALID` and enforced for new rows; no difference |
| D. Migration SQL executed twice | Both runs succeed |
| Local dev database with no `_prisma_migrations` table | Baselined with `migrate resolve --applied` for the 22 historical migrations, then `migrate deploy`; no difference |

## Before applying to production (read-only checks; the owner runs these)

Deploying the app does **not** run migrations: the `build` script is `next build`. Apply them deliberately.

1. Run `npx prisma migrate status` against production. It only reads.
   - If it lists every historical migration as applied, `npx prisma migrate deploy` applies only the repair.
   - If production has **no migration history** (error P3005, or every migration listed as unapplied), it was probably managed with `db push`. Do **not** run `migrate deploy` directly: it would try to replay `init` against existing tables. Baseline first, after a backup: `npx prisma migrate resolve --applied <name>` for each of the 22 historical migrations, then `migrate deploy`.
2. Run `npx prisma migrate diff --from-url "$PROD_URL" --to-schema-datamodel prisma/schema.prisma --script`. It only reads.
   - Expect only statements that this repair migration covers.
   - Anything else (for example a column with a different type) means production has its own drift. Stop and review it.
3. Take a backup or snapshot, then apply.
4. Optionally validate the foreign keys once you've confirmed there are no orphaned rows:
   ```sql
   SELECT count(*) FROM "PromoRedemption" r LEFT JOIN "PromoCode" c ON c.id = r."promoCodeId" WHERE c.id IS NULL;
   SELECT count(*) FROM "PromoRedemption" r LEFT JOIN "UserEntitlement" e ON e."userId" = r."userId" WHERE e."userId" IS NULL;
   ALTER TABLE "PromoRedemption" VALIDATE CONSTRAINT "PromoRedemption_promoCodeId_fkey";
   ALTER TABLE "PromoRedemption" VALIDATE CONSTRAINT "PromoRedemption_userId_fkey";
   ```

**Never** use `prisma db push` against production. It applies the schema without recording history, which is how this drift arose. It can also remove objects that are not in the schema; the local dev database lost both its `_prisma_migrations` history and the `selectedQuizTypes` default after a `db push`.
