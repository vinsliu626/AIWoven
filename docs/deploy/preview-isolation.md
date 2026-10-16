# Vercel Preview isolation: what is known and how to test safely

Status (2026-10-16): **isolation is not verified.** This repository and session have no
Vercel CLI, token, or project settings, so nothing below about the Vercel project's
environment variables was observed. It is a checklist, not a finding. Until every box in
"Before the first Preview deploy" is ticked in the Vercel dashboard, assume a Preview
deployment talks to the same database, Stripe account, OAuth apps and AI providers as
production.

## What the repository shows

- `main` has no `vercel.json`. Every branch push therefore creates a Preview deployment
  under Vercel's defaults, using whatever variables are set for the *Preview* environment.
  Variables added in the dashboard without unticking "Preview" are shared with production.
- `backup/ai-note-reliability-20261015` carries a `vercel.json` that sets
  `git.deploymentEnabled` to false for that branch and an `ignoreCommand` that skips its
  builds. Both apply only to that branch name, and only while the file is at its tip.
- `npm run build` is `next build`, which uses Turbopack in Next 16. Until commit
  "fix(build): resolve turbopack.root from the project directory" on the backup branch,
  `next.config.ts` pinned `turbopack.root` to a Windows path. On Linux, Vercel's build
  image included, that path makes the Turbopack build panic ("Invalid distDirRoot"),
  which was reproduced locally from `main`'s config. Either the Vercel project overrides
  the build command (for example with `--webpack`), or production builds of `main` after
  2026-07-17 failed. Check the project's Build Command and its recent deployments.
  If the build is webpack, production also shipped the pdf.js bug fixed on the backup
  branch (PDF→JPG conversion and AI Study PDF upload fail with "Object.defineProperty
  called on non-object").

## Stateful services a Preview would touch

| Service | Variables | Risk if shared with production |
| --- | --- | --- |
| Postgres (Prisma; also stores note audio as `bytea`) | `DATABASE_URL`, `DIRECT_URL` | Preview writes users, notes, quotas, entitlements and audio into the production DB; a migration run against it changes production schema |
| Auth (NextAuth) | `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_ID/SECRET` (`GITHUB_CLIENT_ID/SECRET`) | Shared secret = Preview session cookies are valid production sessions and vice versa; OAuth redirects may point at production |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ULTRA` | Live keys create real charges/customers; a webhook endpoint pointed at Preview can grant entitlements in the shared DB |
| Paid AI / ASR providers | `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`, `KIMI_API_KEY`, `ASR_URL`, `DETECTOR_URL`, `PY_DETECTOR_URL` | Preview traffic is billed to the production accounts and shares their rate limits |
| Promotions / owner access | `PROMO_CODE_SECRET`, `OWNER_USER_ID`, `OWNER_EMAIL`, `PREMIUM_BYPASS_USER_IDS` | Codes minted in Preview redeem in production; bypass lists apply in both |
| Bypass / test flags | `DEV_BYPASS_AUTH`, `DEV_BYPASS_QUOTA`, `AI_NOTE_TEST_MODE`, `AI_NOTE_DEV_BYPASS_AUTH`, `AI_DETECTOR_DEV_BYPASS_AUTH`, `E2E_AUTH_ENABLED` | `DEV_BYPASS_AUTH`, `DEV_BYPASS_QUOTA` and `AI_NOTE_TEST_MODE` are **not** gated on `NODE_ENV`, so on Vercel (where `NODE_ENV=production`) they still turn off auth, quotas, or real ASR. They must be unset in every Vercel environment |

## Before the first Preview deploy (dashboard checks)

1. Project → Settings → Environment Variables: filter by **Preview**. For every variable in
   the table above, confirm it is either absent or has a Preview-only value that differs
   from Production. Do not copy values out of the dashboard; compare by editing scope.
2. Database: create a separate Preview database (for example a Neon branch or a new
   Postgres instance), set Preview-only `DATABASE_URL` and `DIRECT_URL`, then from a local
   machine run `npx prisma migrate deploy` against *that* URL only. If the database was
   created from a production snapshot, follow `docs/db/schema-drift-repair.md` first and
   scrub user data, or start empty.
3. Auth: set a Preview-only `NEXTAUTH_SECRET`. Leave `NEXTAUTH_URL` unset so the
   deployment URL is used, or set it to the Preview domain. Use separate OAuth apps, or
   add the Preview callback URL to test OAuth apps, never the production ones.
4. Stripe: use test-mode `STRIPE_SECRET_KEY` and test price IDs, and a test-mode webhook
   endpoint with its own `STRIPE_WEBHOOK_SECRET`.
5. AI providers: leave the paid keys unset in Preview, so AI features fail rather than
   spend, or set separate keys with spend caps once paid calls are approved.
6. Confirm the bypass and test flags listed above are unset in Preview *and* Production.
7. Check Settings → Git → "Ignored Build Step" and Build Command, and record which
   bundler production uses (see above).
8. Check whether Deployment Protection (Vercel Authentication) is on for Preview, so the
   Preview URL is not public.

## Running a Preview test once those checks pass

1. Create a dedicated branch from the commit to test, for example
   `git switch -c preview/stabilization backup/ai-note-reliability-20261015`.
2. Remove the backup-only `vercel.json` on that branch (`git rm vercel.json && git commit`)
   so the branch deploys. Do not change `vercel.json` on the backup branch itself.
3. Push that branch only. Vercel builds a Preview with Preview-scoped variables.
4. Smoke test against the Preview URL with test accounts: sign in and out, the workspace
   navigation, PDF→JPG conversion, an AI Study PDF upload, and (only with approved AI
   keys) one short AI Note recording.
5. Delete the Preview branch and deployment when finished. Merging to `main` and the
   production deploy are a separate decision.
